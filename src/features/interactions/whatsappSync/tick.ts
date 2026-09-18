import { ProcessFileLock, SyncLockHeldError } from "../appleMessagesSync/lock";
import type { RecruitCatalogPort } from "../appleMessagesSync/ports";
import { ProductionHostError } from "./config";
import { effectiveImportFloor } from "./destination";
import { prepareWhatsAppImport, selectForwardImportMessages, maxCursorFromRows } from "./engine";
import { DEFAULT_LEASE_MS } from "./jobQueue";
import type { JobQueuePort, PresencePort, SecretStorePort, SyncJob } from "./ports";
import { startBaileysSession } from "./baileysSession";
import type { WhatsAppSyncStore } from "./store";
import type { WhatsAppWriterPort } from "./writer";
import type { WhatsAppHelperMode } from "./config";

export type TickAction = "lock_held" | "claim" | "idle" | "rejected" | "failed";

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
  store: WhatsAppSyncStore;
  queue: JobQueuePort;
  secrets: SecretStorePort;
  presence: PresencePort;
  writer: WhatsAppWriterPort;
  recruits: RecruitCatalogPort;
  supabaseUrl: string;
  destinationKey: string;
  destinationHost: string;
  mode: WhatsAppHelperMode;
  leaseMs?: number;
  /** Injected in tests to avoid Baileys. */
  fetchConversationMessages?: (conversationId: string) => Promise<
    import("../whatsapp").WhatsAppMessageRow[]
  >;
  connectSession?: () => Promise<{
    accountId: string;
    close: () => Promise<void>;
    fetchConversationMessages: (conversationId: string) => Promise<
      import("../whatsapp").WhatsAppMessageRow[]
    >;
  }>;
};

function errorCodeFrom(error: unknown): string {
  if (error instanceof ProductionHostError) return "host_not_production";
  if (error instanceof Error && /keychain/i.test(error.message)) return "keychain_unavailable";
  if (error instanceof Error && error.message === "conversation_not_selected") {
    return "conversation_not_selected";
  }
  if (error instanceof Error && error.message === "recruit_not_selected") {
    return "recruit_not_selected";
  }
  if (error instanceof Error && error.message === "recruit_missing_in_destination") {
    return "recruit_missing_in_destination";
  }
  if (error instanceof Error && /recruiting_interactions|upsert/i.test(error.message)) {
    return "writer_failed";
  }
  return "import_failed";
}

function logSafeTickFailure(error: unknown, errorCode: string): void {
  const name = error instanceof Error ? error.name : "unknown";
  console.error(`whatsapp tick diagnostic code=${errorCode} name=${name}`);
}

async function publishPresence(runtime: TickRuntime, errorCode: string | null = null): Promise<void> {
  const state = runtime.store.readState();
  await runtime.presence.upsertPresence({
    lastSeenAt: runtime.now.toISOString(),
    connectionState: state.connectionState,
    accountId: state.accountId,
    destinationHost: runtime.destinationHost,
    importFromAt: state.importFromAt,
    productionActivationAt: state.productionActivationAt,
    selectedConversationId: state.selectedConversationId,
    lastErrorCode: errorCode ?? state.lastErrorCode,
    importedCount: state.importedCount,
    skippedCount: state.skippedCount,
    unmatchedCount: state.unmatchedCount,
  });
}

async function openSession(runtime: TickRuntime) {
  if (runtime.connectSession) {
    return runtime.connectSession();
  }
  const session = await startBaileysSession({
    home: runtime.home,
    onProgress: () => undefined,
  });
  const accountId = await session.waitUntilOpen(60_000);
  runtime.store.setConnectionState("connected", { accountId });
  return {
    accountId,
    close: () => session.close(),
    fetchConversationMessages: (conversationId: string) =>
      session.fetchConversationMessages(conversationId),
  };
}

async function runClaimedJob(
  runtime: TickRuntime,
  job: SyncJob,
  expiredLeases: number,
): Promise<TickResult> {
  const now = runtime.now;
  const leaseMs = runtime.leaseMs ?? DEFAULT_LEASE_MS;
  let session: Awaited<ReturnType<typeof openSession>> | null = null;

  try {
    await runtime.queue.heartbeat(job.id, now, leaseMs);

    const state = runtime.store.readState();
    const conversationId = state.selectedConversationId;
    const recruitId = state.selectedRecruitId;
    if (!conversationId) {
      throw new Error("conversation_not_selected");
    }
    if (!recruitId) {
      throw new Error("recruit_not_selected");
    }

    const floor = effectiveImportFloor({
      importFromAt: state.importFromAt,
      productionActivationAt: state.productionActivationAt,
      destinationKey: runtime.destinationKey,
    });
    if (!floor) {
      throw new Error("import_cutoff_missing");
    }

    const matchContext = await runtime.recruits.loadMatchContext();
    const allRecruits = [...matchContext.recruits, ...(matchContext.currentTeam ?? [])];
    const recruitExists = allRecruits.some((row) => row.id === recruitId);
    if (!recruitExists) {
      // Also accept any person id present in catalog recruits only — fail clear if missing.
      throw new Error("recruit_missing_in_destination");
    }

    await runtime.queue.heartbeat(job.id, now, leaseMs);
    session = await openSession(runtime);
    await runtime.queue.heartbeat(job.id, now, leaseMs);

    const rows = await session.fetchConversationMessages(conversationId);
    const cursor = runtime.store.getCursor(runtime.destinationKey, conversationId);
    const forward = selectForwardImportMessages(rows, {
      importFromAt: floor,
      cursor,
    });
    const prepared = prepareWhatsAppImport(
      forward,
      {
        recruits: allRecruits,
        contacts: matchContext.contacts,
        overrides: matchContext.overrides,
        conversationSelections: { [conversationId]: recruitId },
      },
      [],
    );
    const toWrite = prepared.importable.filter(
      (row) => !runtime.store.hasImportedKey(runtime.destinationKey, row.source_key),
    );

    await runtime.queue.heartbeat(job.id, now, leaseMs);
    const { inserted } = await runtime.writer.upsertInteractions(toWrite);
    const at = now.toISOString();
    runtime.store.markImportedKeys(
      runtime.destinationKey,
      toWrite.map((row) => ({ sourceKey: row.source_key, conversationId })),
      at,
    );
    const max = maxCursorFromRows(rows);
    if (max.lastMessageId && max.lastTimestamp != null) {
      runtime.store.upsertCursor({
        destination: runtime.destinationKey,
        conversationId,
        lastMessageId: max.lastMessageId,
        lastTimestamp: max.lastTimestamp,
        importedDelta: inserted,
        at,
      });
    }
    runtime.store.recordSyncCounts({
      at,
      importedDelta: inserted,
      skippedDelta: prepared.skipped + prepared.groupsExcluded + (rows.length - forward.length),
      unmatchedDelta: prepared.unmatched + prepared.ambiguous,
    });

    await runtime.queue.complete(job.id, inserted, now);
    await publishPresence(runtime, null);
    return {
      action: "claim",
      importedCount: inserted,
      errorCode: null,
      jobId: job.id,
      expiredLeases,
    };
  } catch (error) {
    const errorCode =
      error instanceof Error && error.message === "import_cutoff_missing"
        ? "import_cutoff_missing"
        : errorCodeFrom(error);
    logSafeTickFailure(error, errorCode);
    runtime.store.setError(errorCode);
    try {
      await runtime.queue.fail(job.id, errorCode, now);
    } catch {
      // Job may already be closed.
    }
    try {
      await publishPresence(runtime, errorCode);
    } catch {
      // Presence is best-effort.
    }
    return {
      action: "failed",
      importedCount: 0,
      errorCode,
      jobId: job.id,
      expiredLeases,
    };
  } finally {
    try {
      await session?.close();
    } catch {
      // ignore
    }
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

    const secret = runtime.secrets.readServiceRole();
    if (!secret && runtime.mode === "live") {
      await publishPresence(runtime, "keychain_unavailable").catch(() => undefined);
      return {
        action: "failed",
        importedCount: 0,
        errorCode: "keychain_unavailable",
        jobId: null,
        expiredLeases,
      };
    }

    // Heartbeat presence even when idle so Settings shows helper online.
    await publishPresence(runtime, null).catch(() => undefined);

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

    return runClaimedJob(runtime, claimed, expiredLeases);
  } finally {
    runtime.lock.release();
  }
}
