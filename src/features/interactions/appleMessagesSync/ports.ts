import type { ProposedInteraction } from "../appleMessages";
import type { ScanMatchContext } from "./scan";

export type SyncJobTrigger = "manual" | "scheduled" | "catch_up";
export type SyncJobStatus = "queued" | "running" | "completed" | "failed";

export type SyncJob = {
  id: string;
  trigger: SyncJobTrigger;
  status: SyncJobStatus;
  requestedBy: string | null;
  requestedAt: string;
  startedAt: string | null;
  heartbeatAt: string | null;
  leaseExpiresAt: string | null;
  finishedAt: string | null;
  importedCount: number | null;
  errorCode: string | null;
};

export type SyncStatus = {
  activeJob: SyncJob | null;
  lastCompleted: SyncJob | null;
  lastFinished: SyncJob | null;
};

export type EnqueueResult = {
  job: SyncJob;
  created: boolean;
};

export interface JobQueuePort {
  enqueueManual(userId: string, now?: Date): Promise<EnqueueResult>;
  enqueueTriggered(trigger: Exclude<SyncJobTrigger, "manual">, now?: Date): Promise<EnqueueResult>;
  getStatus(): Promise<SyncStatus>;
  claimQueued(now: Date, leaseMs: number): Promise<SyncJob | null>;
  heartbeat(jobId: string, now: Date, leaseMs: number): Promise<void>;
  complete(jobId: string, importedCount: number, now: Date): Promise<void>;
  fail(jobId: string, errorCode: string, now: Date): Promise<void>;
  failExpiredLeases(now: Date): Promise<number>;
}

export interface SecretStorePort {
  readServiceRole(): string | null;
}

export interface ProductionWriterPort {
  upsertInteractions(rows: ProposedInteraction[]): Promise<{ inserted: number }>;
}

export interface RecruitCatalogPort {
  loadMatchContext(): Promise<ScanMatchContext>;
}

export class Phase1UnavailableError extends Error {
  constructor(port: string) {
    super(`${port} is not available until a later Apple Messages sync phase.`);
    this.name = "Phase1UnavailableError";
  }
}

function unavailable(port: string): never {
  throw new Phase1UnavailableError(port);
}

export const unavailableJobQueue: JobQueuePort = {
  enqueueManual: async () => unavailable("JobQueuePort"),
  enqueueTriggered: async () => unavailable("JobQueuePort"),
  getStatus: async () => {
    throw new Phase1UnavailableError("JobQueuePort");
  },
  claimQueued: async () => {
    throw new Phase1UnavailableError("JobQueuePort");
  },
  heartbeat: async () => {
    throw new Phase1UnavailableError("JobQueuePort");
  },
  complete: async () => {
    throw new Phase1UnavailableError("JobQueuePort");
  },
  fail: async () => {
    throw new Phase1UnavailableError("JobQueuePort");
  },
  failExpiredLeases: async () => {
    throw new Phase1UnavailableError("JobQueuePort");
  },
};

export const unavailableSecretStore: SecretStorePort = {
  readServiceRole: () => {
    throw new Phase1UnavailableError("SecretStorePort");
  },
};

export const unavailableProductionWriter: ProductionWriterPort = {
  upsertInteractions: async () => {
    throw new Phase1UnavailableError("ProductionWriterPort");
  },
};
