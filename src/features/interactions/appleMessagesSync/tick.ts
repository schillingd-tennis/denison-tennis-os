import { recordBaseline, retryUnresolved, scanForward, type MessagesCatalog } from "./engine";
import { ProcessFileLock, SyncLockHeldError } from "./lock";
import { DEFAULT_LEASE_MS } from "./jobQueue";
import type {
  JobQueuePort,
  ProductionWriterPort,
  RecruitCatalogPort,
  SecretStorePort,
  SyncJob,
} from "./ports";
import { assertProductionSupabaseUrl, ProductionHostError } from "./config";
import { decideTick, type TickDecision } from "./schedule";
import type { AppleMessagesSyncStore } from "./store";

export type TickAction =
  | "lock_held"
  | "baseline"
  | "claim"
  | "catch_up"
  | "scheduled"
  | "idle"
  | "rejected"
  | "failed";

export type TickResult = {
  action: TickAction;
  importedCount: number;
  errorCode: string | null;
  jobId: string | null;
  expiredLeases: number;
};

export type TickRuntime = {
  now: Date;
  home: string;
  lock: ProcessFileLock;
  store: AppleMessagesSyncStore;
  catalog: MessagesCatalog;
  queue: JobQueuePort;
  secrets: SecretStorePort;
  writer: ProductionWriterPort;
  recruits: RecruitCatalogPort;
  supabaseUrl: string;
  leaseMs?: number;
};

function errorCodeFrom(error: unknown): string {
  if (error instanceof ProductionHostError) return "host_not_production";
  if (error instanceof Error && /keychain/i.test(error.message)) return "keychain_unavailable";
  if (error instanceof Error && /recruiting_interactions|upsert/i.test(error.message)) {
    return "writer_failed";
  }
  return "import_failed";
}

async function runClaimedJob(
  runtime: TickRuntime,
  job: SyncJob,
  decision: TickAction,
  expiredLeases: number,
): Promise<TickResult> {
  const now = runtime.now;
  const leaseMs = runtime.leaseMs ?? DEFAULT_LEASE_MS;
  const cursorBefore = runtime.store.readState().lastScannedRowId;
  try {
    await runtime.queue.heartbeat(job.id, now, leaseMs);
    const context = await runtime.recruits.loadMatchContext();
    const retried = retryUnresolved(runtime.store, context, now, { persistImported: false });
    await runtime.queue.heartbeat(job.id, now, leaseMs);
    const scanned = scanForward(runtime.store, runtime.catalog, context, now);
    await runtime.queue.heartbeat(job.id, now, leaseMs);
    const toWrite = [...retried.newlyMatched, ...scanned.importable];
    const { inserted } = await runtime.writer.upsertInteractions(toWrite);
    const finishedAt = now.toISOString();
    for (const row of retried.newlyMatched) {
      runtime.store.markUnresolvedImported(row.source_key, finishedAt);
    }
    runtime.store.markImportSuccess(finishedAt);
    await runtime.queue.complete(job.id, inserted, now);
    return {
      action: decision,
      importedCount: inserted,
      errorCode: null,
      jobId: job.id,
      expiredLeases,
    };
  } catch (error) {
    if (cursorBefore != null) runtime.store.setLastScannedRowId(cursorBefore);
    const errorCode = errorCodeFrom(error);
    try {
      await runtime.queue.fail(job.id, errorCode, now);
    } catch {
      // Job may already be closed.
    }
    return {
      action: "failed",
      importedCount: 0,
      errorCode,
      jobId: job.id,
      expiredLeases,
    };
  }
}

export async function runTick(runtime: TickRuntime): Promise<TickResult> {
  const now = runtime.now;
  const leaseMs = runtime.leaseMs ?? DEFAULT_LEASE_MS;

  try {
    runtime.lock.acquire();
  } catch (error) {
    if (error instanceof SyncLockHeldError) {
      return {
        action: "lock_held",
        importedCount: 0,
        errorCode: "lock_held",
        jobId: null,
        expiredLeases: 0,
      };
    }
    throw error;
  }

  try {
    const expiredLeases = await runtime.queue.failExpiredLeases(now);

    if (!runtime.store.hasBaseline()) {
      recordBaseline(runtime.store, runtime.catalog, now);
      return {
        action: "baseline",
        importedCount: 0,
        errorCode: null,
        jobId: null,
        expiredLeases,
      };
    }

    try {
      assertProductionSupabaseUrl(runtime.supabaseUrl);
    } catch {
      return {
        action: "rejected",
        importedCount: 0,
        errorCode: "host_not_production",
        jobId: null,
        expiredLeases,
      };
    }

    const secret = runtime.secrets.readServiceRole();
    if (!secret) {
      return {
        action: "failed",
        importedCount: 0,
        errorCode: "keychain_unavailable",
        jobId: null,
        expiredLeases,
      };
    }

    const status = await runtime.queue.getStatus();
    const state = runtime.store.readState();
    const decision: TickDecision = decideTick({
      hasBaseline: true,
      activeStatus:
        status.activeJob?.status === "queued" || status.activeJob?.status === "running"
          ? status.activeJob.status
          : null,
      now,
      activationAt: state.activationAt,
      lastImportSuccessAt: state.lastImportSuccessAt,
    });

    if (decision === "idle" || decision === "baseline") {
      return {
        action: decision === "baseline" ? "baseline" : "idle",
        importedCount: 0,
        errorCode: null,
        jobId: null,
        expiredLeases,
      };
    }

    if (decision === "catch_up" || decision === "scheduled") {
      await runtime.queue.enqueueTriggered(decision, now);
    }

    const claimed = await runtime.queue.claimQueued(now, leaseMs);
    if (!claimed) {
      return {
        action: "idle",
        importedCount: 0,
        errorCode: null,
        jobId: null,
        expiredLeases,
      };
    }

    const action: TickAction = decision === "claim" ? "claim" : decision;
    return runClaimedJob(runtime, claimed, action, expiredLeases);
  } finally {
    runtime.lock.release();
  }
}
