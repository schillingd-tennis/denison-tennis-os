import type { WhatsAppSyncState } from "./store";

export const CONNECTION_DESCRIPTION =
  "Links personal WhatsApp via a Mac helper (Baileys). Imports text into local development only — never production Supabase.";

export type WhatsAppUiStatus = {
  connectionState: WhatsAppSyncState["connectionState"];
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
  };
}

export function formatWhatsAppStatus(state: WhatsAppSyncState, unmatchedConversations = 0): WhatsAppUiStatus {
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
