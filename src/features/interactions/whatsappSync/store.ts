import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { LOCAL_DESTINATION_KEY } from "./destination";
import { syncDatabasePath } from "./paths";

export type WhatsAppConnectionState =
  | "disconnected"
  | "qr_ready"
  | "pairing_code_ready"
  | "connecting"
  | "connected"
  | "logged_out"
  | "error";

export type WhatsAppSyncState = {
  connectionState: WhatsAppConnectionState;
  accountId: string | null;
  pairedAt: string | null;
  lastSyncAt: string | null;
  lastErrorCode: string | null;
  importedCount: number;
  skippedCount: number;
  unmatchedCount: number;
  selectedConversationId: string | null;
  selectedRecruitId: string | null;
  /** ISO timestamp; messages strictly before this are never imported. */
  importFromAt: string | null;
  /** ISO; set once when enabling live destination. Never auto-reset. */
  productionActivationAt: string | null;
};

export type UnmatchedConversation = {
  conversationId: string;
  handle: string | null;
  displayName: string | null;
  reason: "unmatched" | "ambiguous" | "group" | "deselected";
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  connection_state TEXT NOT NULL DEFAULT 'disconnected',
  account_id TEXT,
  paired_at TEXT,
  last_sync_at TEXT,
  last_error_code TEXT,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  unmatched_count INTEGER NOT NULL DEFAULT 0,
  selected_conversation_id TEXT,
  selected_recruit_id TEXT,
  import_from_at TEXT,
  production_activation_at TEXT
);

CREATE TABLE IF NOT EXISTS conversation_cursors (
  destination TEXT NOT NULL DEFAULT 'local',
  conversation_id TEXT NOT NULL,
  last_message_id TEXT,
  last_timestamp INTEGER,
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (destination, conversation_id)
);

CREATE TABLE IF NOT EXISTS unmatched_conversations (
  conversation_id TEXT PRIMARY KEY,
  handle TEXT,
  display_name TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('unmatched', 'ambiguous', 'group', 'deselected')),
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS imported_keys (
  destination TEXT NOT NULL DEFAULT 'local',
  source_key TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  PRIMARY KEY (destination, source_key)
);
`;

export class WhatsAppSyncStore {
  readonly db: DatabaseSync;

  constructor(readonly home: string) {
    mkdirSync(home, { recursive: true });
    this.db = new DatabaseSync(syncDatabasePath(home));
    this.db.exec(SCHEMA);
    this.db.exec(`INSERT OR IGNORE INTO sync_state (id) VALUES (1)`);
    this.ensureAdditiveColumns();
    this.ensureDestinationScopedTables();
  }

  /** Additive columns for existing sqlite DBs — never resets stored cutoffs. */
  private ensureAdditiveColumns(): void {
    const cols = this.db.prepare(`PRAGMA table_info(sync_state)`).all() as Array<{ name: string }>;
    const names = new Set(cols.map((col) => col.name));
    if (!names.has("import_from_at")) {
      this.db.exec(`ALTER TABLE sync_state ADD COLUMN import_from_at TEXT`);
    }
    if (!names.has("production_activation_at")) {
      this.db.exec(`ALTER TABLE sync_state ADD COLUMN production_activation_at TEXT`);
    }
    if (!names.has("selected_recruit_id")) {
      this.db.exec(`ALTER TABLE sync_state ADD COLUMN selected_recruit_id TEXT`);
    }
  }

  /**
   * Migrate legacy unscoped receipt tables to destination-scoped PKs.
   * Existing rows become destination=`local` so they cannot skip production imports.
   */
  private ensureDestinationScopedTables(): void {
    const cursorCols = this.db.prepare(`PRAGMA table_info(conversation_cursors)`).all() as Array<{
      name: string;
    }>;
    if (cursorCols.length > 0 && !cursorCols.some((col) => col.name === "destination")) {
      this.db.exec(`
        CREATE TABLE conversation_cursors_v2 (
          destination TEXT NOT NULL DEFAULT 'local',
          conversation_id TEXT NOT NULL,
          last_message_id TEXT,
          last_timestamp INTEGER,
          imported_count INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (destination, conversation_id)
        );
        INSERT INTO conversation_cursors_v2
          (destination, conversation_id, last_message_id, last_timestamp, imported_count, updated_at)
        SELECT '${LOCAL_DESTINATION_KEY}', conversation_id, last_message_id, last_timestamp, imported_count, updated_at
        FROM conversation_cursors;
        DROP TABLE conversation_cursors;
        ALTER TABLE conversation_cursors_v2 RENAME TO conversation_cursors;
      `);
    }

    const keyCols = this.db.prepare(`PRAGMA table_info(imported_keys)`).all() as Array<{ name: string }>;
    if (keyCols.length > 0 && !keyCols.some((col) => col.name === "destination")) {
      this.db.exec(`
        CREATE TABLE imported_keys_v2 (
          destination TEXT NOT NULL DEFAULT 'local',
          source_key TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          PRIMARY KEY (destination, source_key)
        );
        INSERT INTO imported_keys_v2 (destination, source_key, conversation_id, imported_at)
        SELECT '${LOCAL_DESTINATION_KEY}', source_key, conversation_id, imported_at
        FROM imported_keys;
        DROP TABLE imported_keys;
        ALTER TABLE imported_keys_v2 RENAME TO imported_keys;
      `);
    }
  }

  close(): void {
    this.db.close();
  }

  readState(): WhatsAppSyncState {
    const row = this.db.prepare(`SELECT * FROM sync_state WHERE id = 1`).get() as
      | {
          connection_state: string;
          account_id: string | null;
          paired_at: string | null;
          last_sync_at: string | null;
          last_error_code: string | null;
          imported_count: number;
          skipped_count: number;
          unmatched_count: number;
          selected_conversation_id: string | null;
          selected_recruit_id?: string | null;
          import_from_at?: string | null;
          production_activation_at?: string | null;
        }
      | undefined;
    return {
      connectionState: (row?.connection_state as WhatsAppConnectionState) ?? "disconnected",
      accountId: row?.account_id ?? null,
      pairedAt: row?.paired_at ?? null,
      lastSyncAt: row?.last_sync_at ?? null,
      lastErrorCode: row?.last_error_code ?? null,
      importedCount: row?.imported_count ?? 0,
      skippedCount: row?.skipped_count ?? 0,
      unmatchedCount: row?.unmatched_count ?? 0,
      selectedConversationId: row?.selected_conversation_id ?? null,
      selectedRecruitId: row?.selected_recruit_id ?? null,
      importFromAt: row?.import_from_at ?? null,
      productionActivationAt: row?.production_activation_at ?? null,
    };
  }

  getImportFromAt(): string | null {
    return this.readState().importFromAt;
  }

  getProductionActivationAt(): string | null {
    return this.readState().productionActivationAt;
  }

  /**
   * Persist forward-only cutoff. Never clears an existing value unless `force` is true.
   * Returns the effective ISO timestamp.
   */
  enableForwardOnlyImport(at: Date | string = new Date(), options?: { force?: boolean }): string {
    const iso = typeof at === "string" ? at : at.toISOString();
    if (!options?.force) {
      const existing = this.getImportFromAt();
      if (existing) return existing;
    }
    this.db.prepare(`UPDATE sync_state SET import_from_at = ? WHERE id = 1`).run(iso);
    return iso;
  }

  /**
   * Ensure a cutoff exists (sets to `now` once). Does not overwrite.
   */
  ensureImportFromAt(now: Date = new Date()): string {
    return this.enableForwardOnlyImport(now);
  }

  /**
   * Set production_activation_at once when enabling live destination.
   * Never auto-resets. Does not touch import_from_at.
   */
  enableProductionActivation(at: Date | string = new Date(), options?: { force?: boolean }): string {
    const iso = typeof at === "string" ? at : at.toISOString();
    if (!options?.force) {
      const existing = this.getProductionActivationAt();
      if (existing) return existing;
    }
    this.db.prepare(`UPDATE sync_state SET production_activation_at = ? WHERE id = 1`).run(iso);
    return iso;
  }

  setConnectionState(
    state: WhatsAppConnectionState,
    extras?: { accountId?: string | null; pairedAt?: string | null; errorCode?: string | null },
  ): void {
    this.db
      .prepare(
        `UPDATE sync_state SET
           connection_state = ?,
           account_id = COALESCE(?, account_id),
           paired_at = COALESCE(?, paired_at),
           last_error_code = ?
         WHERE id = 1`,
      )
      .run(state, extras?.accountId ?? null, extras?.pairedAt ?? null, extras?.errorCode ?? null);
  }

  setSelectedConversation(conversationId: string | null, recruitId?: string | null): void {
    if (recruitId !== undefined) {
      this.db
        .prepare(
          `UPDATE sync_state SET selected_conversation_id = ?, selected_recruit_id = ? WHERE id = 1`,
        )
        .run(conversationId, recruitId);
      return;
    }
    this.db.prepare(`UPDATE sync_state SET selected_conversation_id = ? WHERE id = 1`).run(conversationId);
  }

  setSelectedRecruit(recruitId: string | null): void {
    this.db.prepare(`UPDATE sync_state SET selected_recruit_id = ? WHERE id = 1`).run(recruitId);
  }

  recordSyncCounts(input: {
    at: string;
    importedDelta: number;
    skippedDelta: number;
    unmatchedDelta: number;
  }): void {
    this.db
      .prepare(
        `UPDATE sync_state SET
           last_sync_at = ?,
           imported_count = imported_count + ?,
           skipped_count = skipped_count + ?,
           unmatched_count = unmatched_count + ?,
           last_error_code = NULL
         WHERE id = 1`,
      )
      .run(input.at, input.importedDelta, input.skippedDelta, input.unmatchedDelta);
  }

  setError(code: string): void {
    this.db.prepare(`UPDATE sync_state SET last_error_code = ?, connection_state = 'error' WHERE id = 1`).run(code);
  }

  getCursor(
    destination: string,
    conversationId: string,
  ): { lastMessageId: string | null; lastTimestamp: number | null } {
    const row = this.db
      .prepare(
        `SELECT last_message_id, last_timestamp FROM conversation_cursors
         WHERE destination = ? AND conversation_id = ?`,
      )
      .get(destination, conversationId) as
      | { last_message_id: string | null; last_timestamp: number | null }
      | undefined;
    return {
      lastMessageId: row?.last_message_id ?? null,
      lastTimestamp: row?.last_timestamp ?? null,
    };
  }

  upsertCursor(input: {
    destination: string;
    conversationId: string;
    lastMessageId: string;
    lastTimestamp: number;
    importedDelta: number;
    at: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO conversation_cursors
           (destination, conversation_id, last_message_id, last_timestamp, imported_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(destination, conversation_id) DO UPDATE SET
           last_message_id = excluded.last_message_id,
           last_timestamp = excluded.last_timestamp,
           imported_count = conversation_cursors.imported_count + excluded.imported_count,
           updated_at = excluded.updated_at`,
      )
      .run(
        input.destination,
        input.conversationId,
        input.lastMessageId,
        input.lastTimestamp,
        input.importedDelta,
        input.at,
      );
  }

  hasImportedKey(destination: string, sourceKey: string): boolean {
    const row = this.db
      .prepare(`SELECT 1 AS ok FROM imported_keys WHERE destination = ? AND source_key = ?`)
      .get(destination, sourceKey) as { ok: number } | undefined;
    return Boolean(row);
  }

  markImportedKeys(
    destination: string,
    keys: Array<{ sourceKey: string; conversationId: string }>,
    at: string,
  ): void {
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO imported_keys (destination, source_key, conversation_id, imported_at)
       VALUES (?, ?, ?, ?)`,
    );
    for (const row of keys) {
      stmt.run(destination, row.sourceKey, row.conversationId, at);
    }
  }

  upsertUnmatched(row: Omit<UnmatchedConversation, "createdAt"> & { createdAt?: string }): void {
    const createdAt = row.createdAt ?? new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO unmatched_conversations
           (conversation_id, handle, display_name, reason, message_count, last_message_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(conversation_id) DO UPDATE SET
           handle = excluded.handle,
           display_name = excluded.display_name,
           reason = excluded.reason,
           message_count = excluded.message_count,
           last_message_at = excluded.last_message_at`,
      )
      .run(
        row.conversationId,
        row.handle,
        row.displayName,
        row.reason,
        row.messageCount,
        row.lastMessageAt,
        createdAt,
      );
  }

  listUnmatched(): UnmatchedConversation[] {
    const rows = this.db
      .prepare(
        `SELECT conversation_id, handle, display_name, reason, message_count, last_message_at, created_at
         FROM unmatched_conversations
         ORDER BY created_at DESC`,
      )
      .all() as Array<{
      conversation_id: string;
      handle: string | null;
      display_name: string | null;
      reason: UnmatchedConversation["reason"];
      message_count: number;
      last_message_at: string | null;
      created_at: string;
    }>;
    return rows.map((row) => ({
      conversationId: row.conversation_id,
      handle: row.handle,
      displayName: row.display_name,
      reason: row.reason,
      messageCount: row.message_count,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
    }));
  }

  clearSessionMeta(): void {
    this.db.exec(`
      UPDATE sync_state SET
        connection_state = 'disconnected',
        account_id = NULL,
        paired_at = NULL,
        selected_conversation_id = NULL,
        selected_recruit_id = NULL,
        last_error_code = NULL
      WHERE id = 1;
    `);
  }
}

export function openWhatsAppSyncStore(home: string): WhatsAppSyncStore {
  return new WhatsAppSyncStore(home);
}
