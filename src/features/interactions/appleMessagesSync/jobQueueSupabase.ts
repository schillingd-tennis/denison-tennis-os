import type { SyncJob, SyncJobStatus } from "./ports";
import { JOBS_TABLE, type JobQueueStore } from "./jobQueue";

type JobRow = {
  id: string;
  trigger: SyncJob["trigger"];
  status: SyncJobStatus;
  requested_by: string | null;
  requested_at: string;
  started_at: string | null;
  heartbeat_at: string | null;
  lease_expires_at: string | null;
  finished_at: string | null;
  imported_count: number | null;
  error_code: string | null;
};

export type JobsQuery = {
  data: JobRow[] | JobRow | null;
  error: { code?: string; message: string } | null;
};

export type JobsTable = {
  select: (columns: string) => JobsTable;
  insert: (row: Record<string, unknown>) => Promise<JobsQuery> | JobsTable;
  update: (row: Record<string, unknown>) => JobsTable;
  eq: (column: string, value: string) => JobsTable;
  in: (column: string, values: string[]) => JobsTable;
  is: (column: string, value: null) => JobsTable;
  lt: (column: string, value: string) => JobsTable;
  gt: (column: string, value: number | string) => JobsTable;
  order: (column: string, options: { ascending: boolean }) => JobsTable;
  limit: (count: number) => JobsTable;
  maybeSingle: () => Promise<JobsQuery>;
  then?: (resolve: (value: JobsQuery) => unknown) => Promise<unknown>;
};

export type JobsClient = {
  from: (table: string) => any;
};

export function jobFromRow(row: JobRow): SyncJob {
  return {
    id: row.id,
    trigger: row.trigger,
    status: row.status,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    heartbeatAt: row.heartbeat_at,
    leaseExpiresAt: row.lease_expires_at,
    finishedAt: row.finished_at,
    importedCount: row.imported_count,
    errorCode: row.error_code,
  };
}

export function jobToInsert(job: SyncJob): Record<string, unknown> {
  return {
    id: job.id,
    trigger: job.trigger,
    status: job.status,
    requested_by: job.requestedBy,
    requested_at: job.requestedAt,
    started_at: job.startedAt,
    heartbeat_at: job.heartbeatAt,
    lease_expires_at: job.leaseExpiresAt,
    finished_at: job.finishedAt,
    imported_count: job.importedCount,
    error_code: job.errorCode,
  };
}

/**
 * Helper-side adapter. Inject a Supabase client (service role on the Mac).
 * Tests inject a fake client; this module never opens a hosted connection itself.
 */
export function createSupabaseJobStore(client: JobsClient): JobQueueStore {
  const table = () => client.from(JOBS_TABLE);

  return {
    async findActive() {
      const result = (await table()
        .select("*")
        .in("status", ["queued", "running"])
        .maybeSingle()) as JobsQuery;
      if (result.error) throw new Error(result.error.message);
      if (!result.data || Array.isArray(result.data)) return null;
      return jobFromRow(result.data);
    },

    async findById(id: string) {
      const result = (await table().select("*").eq("id", id).maybeSingle()) as JobsQuery;
      if (result.error) throw new Error(result.error.message);
      if (!result.data || Array.isArray(result.data)) return null;
      return jobFromRow(result.data);
    },

    async insertQueued(job: SyncJob) {
      const result = (await table().insert(jobToInsert(job)).select("*").maybeSingle()) as JobsQuery;
      if (result.error?.code === "23505") return "unique_violation";
      if (result.error) throw new Error(result.error.message);
      return "ok";
    },

    async updateIfStatus(id, expectedStatus, patch) {
      const row: Record<string, unknown> = {};
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
      if (patch.heartbeatAt !== undefined) row.heartbeat_at = patch.heartbeatAt;
      if (patch.leaseExpiresAt !== undefined) row.lease_expires_at = patch.leaseExpiresAt;
      if (patch.finishedAt !== undefined) row.finished_at = patch.finishedAt;
      if (patch.importedCount !== undefined) row.imported_count = patch.importedCount;
      if (patch.errorCode !== undefined) row.error_code = patch.errorCode;
      const result = (await table().update(row).eq("id", id).eq("status", expectedStatus).select("*").maybeSingle()) as JobsQuery;
      if (result.error) throw new Error(result.error.message);
      if (!result.data || Array.isArray(result.data)) return null;
      return jobFromRow(result.data);
    },

    async listExpiredRunning(nowIso: string) {
      const result = (await table()
        .select("*")
        .eq("status", "running")
        .lt("lease_expires_at", nowIso)) as JobsQuery;
      if (result.error) throw new Error(result.error.message);
      const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
      return rows.map(jobFromRow);
    },

    async findLatestCompleted() {
      const result = (await table()
        .select("*")
        .eq("status", "completed")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as JobsQuery;
      if (result.error) throw new Error(result.error.message);
      if (!result.data || Array.isArray(result.data)) return null;
      return jobFromRow(result.data);
    },

    async findLatestCompletedWithImports() {
      const result = (await table()
        .select("*")
        .eq("status", "completed")
        .gt("imported_count", 0)
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as JobsQuery;
      if (result.error) throw new Error(result.error.message);
      if (!result.data || Array.isArray(result.data)) return null;
      return jobFromRow(result.data);
    },

    async findLatestFinished() {
      const result = (await table()
        .select("*")
        .in("status", ["completed", "failed"])
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as JobsQuery;
      if (result.error) throw new Error(result.error.message);
      if (!result.data || Array.isArray(result.data)) return null;
      return jobFromRow(result.data);
    },
  };
}
