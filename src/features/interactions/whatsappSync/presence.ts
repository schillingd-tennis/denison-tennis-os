import type { HelperPresenceRow, PresencePort } from "./ports";

export const PRESENCE_TABLE = "whatsapp_helper_presence";
/** Helper considered online if last_seen within this window. */
export const HELPER_ONLINE_MS = 3 * 60_000;

export function isHelperOnline(lastSeenAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!lastSeenAt) return false;
  const ms = Date.parse(lastSeenAt);
  if (Number.isNaN(ms)) return false;
  return now.getTime() - ms <= HELPER_ONLINE_MS;
}

export type PresenceRowDb = {
  id: number;
  last_seen_at: string | null;
  connection_state: string | null;
  account_id: string | null;
  destination_host: string | null;
  import_from_at: string | null;
  production_activation_at: string | null;
  selected_conversation_id: string | null;
  last_error_code: string | null;
  imported_count: number | null;
  skipped_count: number | null;
  unmatched_count: number | null;
};

export type PresenceQuery = {
  data: PresenceRowDb | PresenceRowDb[] | null;
  error: { message: string } | null;
};

export type PresenceClient = {
  from: (table: string) => any;
};

export function presenceFromRow(row: PresenceRowDb): HelperPresenceRow {
  return {
    lastSeenAt: row.last_seen_at,
    connectionState: row.connection_state,
    accountId: row.account_id,
    destinationHost: row.destination_host,
    importFromAt: row.import_from_at,
    productionActivationAt: row.production_activation_at,
    selectedConversationId: row.selected_conversation_id,
    lastErrorCode: row.last_error_code,
    importedCount: row.imported_count ?? 0,
    skippedCount: row.skipped_count ?? 0,
    unmatchedCount: row.unmatched_count ?? 0,
  };
}

export function presenceToUpsert(row: HelperPresenceRow): Record<string, unknown> {
  return {
    id: 1,
    last_seen_at: row.lastSeenAt,
    connection_state: row.connectionState,
    account_id: row.accountId,
    destination_host: row.destinationHost,
    import_from_at: row.importFromAt,
    production_activation_at: row.productionActivationAt,
    selected_conversation_id: row.selectedConversationId,
    last_error_code: row.lastErrorCode,
    imported_count: row.importedCount,
    skipped_count: row.skippedCount,
    unmatched_count: row.unmatchedCount,
    updated_at: new Date().toISOString(),
  };
}

export function createSupabasePresenceStore(client: PresenceClient): PresencePort {
  return {
    async upsertPresence(row) {
      const result = (await client
        .from(PRESENCE_TABLE)
        .upsert(presenceToUpsert(row), { onConflict: "id" })) as PresenceQuery;
      if (result.error) throw new Error(result.error.message);
    },
    async readPresence() {
      const result = (await client
        .from(PRESENCE_TABLE)
        .select("*")
        .eq("id", 1)
        .maybeSingle()) as PresenceQuery;
      if (result.error) throw new Error(result.error.message);
      if (!result.data || Array.isArray(result.data)) return null;
      return presenceFromRow(result.data);
    },
  };
}

export function createMemoryPresenceStore(): PresencePort & { row: HelperPresenceRow | null } {
  const store: { row: HelperPresenceRow | null } = { row: null };
  return {
    get row() {
      return store.row;
    },
    async upsertPresence(row) {
      store.row = { ...row };
    },
    async readPresence() {
      return store.row ? { ...store.row } : null;
    },
  };
}
