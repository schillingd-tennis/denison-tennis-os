import type { EnqueueResult, JobQueuePort, SyncJob, SyncJobStatus, SyncJobTrigger, SyncStatus } from "./ports";

export const DEFAULT_LEASE_MS = 180_000;
export const JOBS_TABLE = "apple_messages_sync_jobs";

export class JobQueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobQueueError";
  }
}

export type JobQueueStore = {
  findActive(): Promise<SyncJob | null>;
  findById(id: string): Promise<SyncJob | null>;
  insertQueued(job: SyncJob): Promise<"ok" | "unique_violation">;
  updateIfStatus(
    id: string,
    expectedStatus: SyncJobStatus,
    patch: Partial<SyncJob>,
  ): Promise<SyncJob | null>;
  listExpiredRunning(nowIso: string): Promise<SyncJob[]>;
  findLatestCompleted(): Promise<SyncJob | null>;
  findLatestFinished(): Promise<SyncJob | null>;
};

function iso(now: Date): string {
  return now.toISOString();
}

function addMs(now: Date, leaseMs: number): string {
  return new Date(now.getTime() + leaseMs).toISOString();
}

export function createQueuedJob(input: {
  id?: string;
  trigger: SyncJobTrigger;
  requestedBy: string | null;
  now: Date;
}): SyncJob {
  return {
    id: input.id ?? crypto.randomUUID(),
    trigger: input.trigger,
    status: "queued",
    requestedBy: input.requestedBy,
    requestedAt: iso(input.now),
    startedAt: null,
    heartbeatAt: null,
    leaseExpiresAt: null,
    finishedAt: null,
    importedCount: null,
    errorCode: null,
  };
}

async function enqueueIfIdle(
  store: JobQueueStore,
  input: {
    trigger: SyncJobTrigger;
    requestedBy: string | null;
    now: Date;
    conflictMessage: string;
  },
): Promise<EnqueueResult> {
  const active = await store.findActive();
  if (active) return { job: active, created: false };

  const job = createQueuedJob({
    trigger: input.trigger,
    requestedBy: input.requestedBy,
    now: input.now,
  });
  const inserted = await store.insertQueued(job);
  if (inserted === "ok") return { job, created: true };

  const raced = await store.findActive();
  if (raced) return { job: raced, created: false };
  throw new JobQueueError(input.conflictMessage);
}

export function createJobQueue(store: JobQueueStore): JobQueuePort {
  return {
    async enqueueManual(userId: string, now: Date = new Date()): Promise<EnqueueResult> {
      return enqueueIfIdle(store, {
        trigger: "manual",
        requestedBy: userId,
        now,
        conflictMessage: "Could not enqueue a manual Apple Messages sync job.",
      });
    },

    async enqueueTriggered(
      trigger: Exclude<SyncJobTrigger, "manual">,
      now: Date = new Date(),
    ): Promise<EnqueueResult> {
      return enqueueIfIdle(store, {
        trigger,
        requestedBy: null,
        now,
        conflictMessage: `Could not enqueue a ${trigger} Apple Messages sync job.`,
      });
    },

    async getStatus(): Promise<SyncStatus> {
      const [activeJob, lastCompleted, lastFinished] = await Promise.all([
        store.findActive(),
        store.findLatestCompleted(),
        store.findLatestFinished(),
      ]);
      return { activeJob, lastCompleted, lastFinished };
    },

    async claimQueued(now: Date, leaseMs: number = DEFAULT_LEASE_MS): Promise<SyncJob | null> {
      await this.failExpiredLeases(now);
      const active = await store.findActive();
      if (!active || active.status !== "queued") return null;
      const claimed = await store.updateIfStatus(active.id, "queued", {
        status: "running",
        startedAt: iso(now),
        heartbeatAt: iso(now),
        leaseExpiresAt: addMs(now, leaseMs),
      });
      return claimed;
    },

    async heartbeat(jobId: string, now: Date, leaseMs: number = DEFAULT_LEASE_MS): Promise<void> {
      const updated = await store.updateIfStatus(jobId, "running", {
        heartbeatAt: iso(now),
        leaseExpiresAt: addMs(now, leaseMs),
      });
      if (!updated) {
        throw new JobQueueError("Cannot heartbeat a job that is not running.");
      }
    },

    async complete(jobId: string, importedCount: number, now: Date): Promise<void> {
      const updated = await store.updateIfStatus(jobId, "running", {
        status: "completed",
        importedCount,
        finishedAt: iso(now),
        leaseExpiresAt: null,
      });
      if (!updated) {
        throw new JobQueueError("Cannot complete a job that is not running.");
      }
    },

    async fail(jobId: string, errorCode: string, now: Date): Promise<void> {
      const updated = await store.updateIfStatus(jobId, "running", {
        status: "failed",
        errorCode,
        finishedAt: iso(now),
        leaseExpiresAt: null,
      });
      if (!updated) {
        throw new JobQueueError("Cannot fail a job that is not running.");
      }
    },

    async failExpiredLeases(now: Date): Promise<number> {
      const expired = await store.listExpiredRunning(iso(now));
      let count = 0;
      for (const job of expired) {
        const updated = await store.updateIfStatus(job.id, "running", {
          status: "failed",
          errorCode: "lease_expired",
          finishedAt: iso(now),
          leaseExpiresAt: null,
        });
        if (updated) count += 1;
      }
      return count;
    },
  };
}

export function createMemoryJobStore(): JobQueueStore & { jobs: SyncJob[] } {
  const jobs: SyncJob[] = [];

  function active(): SyncJob | null {
    return jobs.find((job) => job.status === "queued" || job.status === "running") ?? null;
  }

  return {
    jobs,
    async findActive() {
      return active();
    },
    async findById(id: string) {
      return jobs.find((job) => job.id === id) ?? null;
    },
    async insertQueued(job: SyncJob) {
      if (active()) return "unique_violation";
      jobs.push({ ...job });
      return "ok";
    },
    async updateIfStatus(id, expectedStatus, patch) {
      const job = jobs.find((row) => row.id === id);
      if (!job || job.status !== expectedStatus) return null;
      Object.assign(job, patch);
      return { ...job };
    },
    async listExpiredRunning(nowIso: string) {
      return jobs.filter(
        (job) =>
          job.status === "running" &&
          job.leaseExpiresAt !== null &&
          job.leaseExpiresAt < nowIso,
      );
    },
    async findLatestCompleted() {
      const completed = jobs
        .filter((job) => job.status === "completed" && job.finishedAt)
        .sort((a, b) => (a.finishedAt! < b.finishedAt! ? 1 : -1));
      return completed[0] ?? null;
    },
    async findLatestFinished() {
      const finished = jobs
        .filter(
          (job) =>
            (job.status === "completed" || job.status === "failed") &&
            job.finishedAt,
        )
        .sort((a, b) => (a.finishedAt! < b.finishedAt! ? 1 : -1));
      return finished[0] ?? null;
    },
  };
}

export function createMemoryJobQueue(): JobQueuePort & { store: ReturnType<typeof createMemoryJobStore> } {
  const store = createMemoryJobStore();
  return Object.assign(createJobQueue(store), { store });
}

export async function enqueueManualForUser(queue: JobQueuePort, userId: string | null, now: Date = new Date()) {
  if (!userId) {
    throw new JobQueueError("Sign in to queue an Apple Messages sync.");
  }
  return queue.enqueueManual(userId, now);
}

export async function readStatusForUser(queue: JobQueuePort, userId: string | null) {
  if (!userId) {
    throw new JobQueueError("Sign in to view Apple Messages sync status.");
  }
  return queue.getStatus();
}
