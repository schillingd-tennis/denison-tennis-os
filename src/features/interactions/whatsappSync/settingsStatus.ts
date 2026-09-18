import type { SyncStatus } from "./ports";
import type { HelperPresenceRow } from "./ports";
import type { WhatsAppSyncState } from "./store";
import { isHelperOnline } from "./presence";

export const CONNECTION_DESCRIPTION =
  "Links personal WhatsApp via a Mac helper (Baileys). Live destination is the OS Supabase project; hosted UI reads jobs and helper presence only.";

export type WhatsAppUiStatus = {
  connectionState: WhatsAppSyncState["connectionState"] | string;
  accountId: string | null;
  pairedAt: string | null;
  lastSyncAt: string | null;
  lastErrorCode: string | null;
  importedCount: number;
  skippedCount: number;
  unmatchedCount: number;
  selectedConversationId: string | null;
  unmatchedConversations: number;
  /** ISO cutoff; displayed in local timezone in Settings. */
  importFromAt: string | null;
  productionActivationAt: string | null;
  destinationHost: string | null;
  helperOnline: boolean;
  activeJobStatus: string | null;
  lastJobFinishedAt: string | null;
  lastJobErrorCode: string | null;
};

export function emptyWhatsAppStatus(): WhatsAppUiStatus {
  return {
    connectionState: "disconnected",
    accountId: null,
    pairedAt: null,
    lastSyncAt: null,
    lastErrorCode: null,
    importedCount: 0,
    skippedCount: 0,
    unmatchedCount: 0,
    selectedConversationId: null,
    unmatchedConversations: 0,
    importFromAt: null,
    productionActivationAt: null,
    destinationHost: null,
    helperOnline: false,
    activeJobStatus: null,
    lastJobFinishedAt: null,
    lastJobErrorCode: null,
  };
}

export function formatWhatsAppStatus(
  state: WhatsAppSyncState,
  unmatchedConversations = 0,
  extras?: Partial<WhatsAppUiStatus>,
): WhatsAppUiStatus {
  return {
    connectionState: state.connectionState,
    accountId: state.accountId,
    pairedAt: state.pairedAt,
    lastSyncAt: state.lastSyncAt,
    lastErrorCode: state.lastErrorCode,
    importedCount: state.importedCount,
    skippedCount: state.skippedCount,
    unmatchedCount: state.unmatchedCount,
    selectedConversationId: state.selectedConversationId,
    unmatchedConversations,
    importFromAt: state.importFromAt,
    productionActivationAt: state.productionActivationAt,
    destinationHost: extras?.destinationHost ?? null,
    helperOnline: extras?.helperOnline ?? false,
    activeJobStatus: extras?.activeJobStatus ?? null,
    lastJobFinishedAt: extras?.lastJobFinishedAt ?? null,
    lastJobErrorCode: extras?.lastJobErrorCode ?? null,
  };
}

export function formatHostedWhatsAppStatus(input: {
  presence: HelperPresenceRow | null;
  jobs: SyncStatus;
  now?: Date;
}): WhatsAppUiStatus {
  const presence = input.presence;
  const lastFinished = input.jobs.lastFinished;
  const lastCompleted = input.jobs.lastCompleted;
  return {
    connectionState: presence?.connectionState ?? "disconnected",
    accountId: presence?.accountId ?? null,
    pairedAt: null,
    lastSyncAt: lastCompleted?.finishedAt ?? presence?.lastSeenAt ?? null,
    lastErrorCode: lastFinished?.errorCode ?? presence?.lastErrorCode ?? null,
    importedCount: presence?.importedCount ?? lastCompleted?.importedCount ?? 0,
    skippedCount: presence?.skippedCount ?? 0,
    unmatchedCount: presence?.unmatchedCount ?? 0,
    selectedConversationId: presence?.selectedConversationId ?? null,
    unmatchedConversations: 0,
    importFromAt: presence?.importFromAt ?? null,
    productionActivationAt: presence?.productionActivationAt ?? null,
    destinationHost: presence?.destinationHost ?? null,
    helperOnline: isHelperOnline(presence?.lastSeenAt, input.now),
    activeJobStatus: input.jobs.activeJob?.status ?? null,
    lastJobFinishedAt: lastFinished?.finishedAt ?? null,
    lastJobErrorCode: lastFinished?.errorCode ?? null,
  };
}

export function connectionStateLabel(state: WhatsAppUiStatus["connectionState"]): string {
  switch (state) {
    case "qr_ready":
      return "QR ready — scan with phone";
    case "pairing_code_ready":
      return "Pairing code ready — enter on phone";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "logged_out":
      return "Logged out";
    case "error":
      return "Error";
    default:
      return "Disconnected";
  }
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Never";
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return "Never";
  return new Date(ms).toLocaleString();
}

export function helperOnlineLabel(online: boolean): string {
  return online ? "Online" : "Offline";
}
