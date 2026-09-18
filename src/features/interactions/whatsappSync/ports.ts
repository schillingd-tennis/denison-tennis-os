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
  lastCompletedWithImports: SyncJob | null;
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

export interface PresencePort {
  upsertPresence(row: HelperPresenceRow): Promise<void>;
  readPresence(): Promise<HelperPresenceRow | null>;
}

export type HelperPresenceRow = {
  lastSeenAt: string | null;
  connectionState: string | null;
  accountId: string | null;
  destinationHost: string | null;
  importFromAt: string | null;
  productionActivationAt: string | null;
  selectedConversationId: string | null;
  lastErrorCode: string | null;
  importedCount: number;
  skippedCount: number;
  unmatchedCount: number;
};
