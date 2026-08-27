import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { syncDatabasePath } from "./paths";

export type SyncState = {
  baselineRowId: number | null;
  activationAt: string | null;
  baselineGuid: string | null;
  lastScannedRowId: number | null;
  lastImportSuccessAt: string | null;
};

export type UnresolvedReason = "unmatched" | "ambiguous" | "decode_failed" | "current_team";
export type UnresolvedRetryStatus = "pending" | "imported";

export type UnresolvedMessage = {
  guid: string;
  rowId: number;
  appleDate: string;
  handle: string;
  reason: UnresolvedReason;
  retryStatus: UnresolvedRetryStatus;
  attemptCount: number;
  lastTriedAt: string | null;
  createdAt: string;
};

export type UnresolvedWrite = {
  guid: string;
  rowId: number;
  appleDate: string;
  handle: string;
  reason: UnresolvedReason;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  baseline_rowid INTEGER,
  activation_at TEXT,
  baseline_guid TEXT,
  last_scanned_rowid INTEGER,
  last_import_success_at TEXT
);

CREATE TABLE IF NOT EXISTS unresolved_messages (
  guid TEXT PRIMARY KEY,
  rowid INTEGER NOT NULL,
  apple_date TEXT NOT NULL,
  handle TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unmatched', 'ambiguous', 'decode_failed', 'current_team')),
  retry_status TEXT NOT NULL CHECK (retry_status IN ('pending', 'imported')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_tried_at TEXT,
  created_at TEXT NOT NULL
);
`;

const UNRESOLVED_BODY_COLUMNS = new Set(["body", "text", "notes", "message", "attributed_body", "attributedBody"]);

export class AppleMessagesSyncStore {
  readonly db: DatabaseSync;

  constructor(readonly home: string) {
    mkdirSync(home, { recursive: true });
    this.db = new DatabaseSync(syncDatabasePath(home));
    this.db.exec(SCHEMA);
    this.db.exec(`INSERT OR IGNORE INTO sync_state (id) VALUES (1)`);
    this.migrateUnresolvedReasons();
  }

  private migrateUnresolvedReasons(): void {
    const schema = this.db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'unresolved_messages'`)
      .get() as { sql: string | null } | undefined;
    if (schema?.sql?.includes("current_team")) return;
    this.db.exec(`
      CREATE TABLE unresolved_messages_v2 (
        guid TEXT PRIMARY KEY,
        rowid INTEGER NOT NULL,
        apple_date TEXT NOT NULL,
        handle TEXT NOT NULL,
        reason TEXT NOT NULL CHECK (reason IN ('unmatched', 'ambiguous', 'decode_failed', 'current_team')),
        retry_status TEXT NOT NULL CHECK (retry_status IN ('pending', 'imported')),
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_tried_at TEXT,
        created_at TEXT NOT NULL
      );
      INSERT INTO unresolved_messages_v2
        (guid, rowid, apple_date, handle, reason, retry_status, attempt_count, last_tried_at, created_at)
      SELECT guid, rowid, apple_date, handle, reason, retry_status, attempt_count, last_tried_at, created_at
        FROM unresolved_messages;
      DROP TABLE unresolved_messages;
      ALTER TABLE unresolved_messages_v2 RENAME TO unresolved_messages;
    `);
  }

  close(): void {
    this.db.close();
  }

  readState(): SyncState {
    const row = this.db.prepare(`SELECT * FROM sync_state WHERE id = 1`).get() as
      | {
          baseline_rowid: number | null;
          activation_at: string | null;
          baseline_guid: string | null;
          last_scanned_rowid: number | null;
          last_import_success_at: string | null;
        }
      | undefined;
    return {
      baselineRowId: row?.baseline_rowid ?? null,
      activationAt: row?.activation_at ?? null,
      baselineGuid: row?.baseline_guid ?? null,
      lastScannedRowId: row?.last_scanned_rowid ?? null,
      lastImportSuccessAt: row?.last_import_success_at ?? null,
    };
  }

  hasBaseline(): boolean {
    const state = this.readState();
    return state.baselineRowId !== null && Boolean(state.activationAt);
  }

  writeBaseline(input: { maxRowId: number; activationAt: string; baselineGuid?: string | null }): SyncState {
    this.db
      .prepare(
        `UPDATE sync_state SET
           baseline_rowid = ?,
           activation_at = ?,
           baseline_guid = ?,
           last_scanned_rowid = ?,
           last_import_success_at = NULL
         WHERE id = 1`,
      )
      .run(input.maxRowId, input.activationAt, input.baselineGuid ?? null, input.maxRowId);
    return this.readState();
  }

  setLastScannedRowId(rowId: number): void {
    this.db.prepare(`UPDATE sync_state SET last_scanned_rowid = ? WHERE id = 1`).run(rowId);
  }

  markImportSuccess(at: string): void {
    this.db.prepare(`UPDATE sync_state SET last_import_success_at = ? WHERE id = 1`).run(at);
  }

  unresolvedColumnNames(): string[] {
    const rows = this.db.prepare(`PRAGMA table_info(unresolved_messages)`).all() as Array<{ name: string }>;
    return rows.map((row) => row.name);
  }

  assertNoBodyColumns(): void {
    const names = this.unresolvedColumnNames();
    const leaked = names.filter((name) => UNRESOLVED_BODY_COLUMNS.has(name));
    if (leaked.length > 0) {
      throw new Error(`unresolved_messages must not store message bodies (${leaked.join(", ")}).`);
    }
  }

  upsertUnresolved(row: UnresolvedWrite, now: string): void {
    const existing = this.db.prepare(`SELECT guid FROM unresolved_messages WHERE guid = ?`).get(row.guid) as
      | { guid: string }
      | undefined;
    if (existing) {
      this.db
        .prepare(
          `UPDATE unresolved_messages
              SET rowid = ?, apple_date = ?, handle = ?, reason = ?, retry_status = 'pending',
                  attempt_count = attempt_count + 1, last_tried_at = ?
            WHERE guid = ?`,
        )
        .run(row.rowId, row.appleDate, row.handle, row.reason, now, row.guid);
      return;
    }
    this.db
      .prepare(
        `INSERT INTO unresolved_messages
           (guid, rowid, apple_date, handle, reason, retry_status, attempt_count, last_tried_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 1, ?, ?)`,
      )
      .run(row.guid, row.rowId, row.appleDate, row.handle, row.reason, now, now);
  }

  listPendingUnresolved(): UnresolvedMessage[] {
    const rows = this.db
      .prepare(
        `SELECT guid, rowid, apple_date, handle, reason, retry_status, attempt_count, last_tried_at, created_at
           FROM unresolved_messages
          WHERE retry_status = 'pending'
          ORDER BY rowid ASC`,
      )
      .all() as Array<{
      guid: string;
      rowid: number;
      apple_date: string;
      handle: string;
      reason: UnresolvedReason;
      retry_status: UnresolvedRetryStatus;
      attempt_count: number;
      last_tried_at: string | null;
      created_at: string;
    }>;
    return rows.map((row) => ({
      guid: row.guid,
      rowId: row.rowid,
      appleDate: row.apple_date,
      handle: row.handle,
      reason: row.reason,
      retryStatus: row.retry_status,
      attemptCount: row.attempt_count,
      lastTriedAt: row.last_tried_at,
      createdAt: row.created_at,
    }));
  }

  markUnresolvedImported(guid: string, now: string): void {
    this.db
      .prepare(
        `UPDATE unresolved_messages
            SET retry_status = 'imported', last_tried_at = ?, attempt_count = attempt_count + 1
          WHERE guid = ?`,
      )
      .run(now, guid);
  }

  countUnresolved(): {
    pending: number;
    unmatched: number;
    ambiguous: number;
    decodeFailed: number;
    currentTeam: number;
    imported: number;
  } {
    const rows = this.db
      .prepare(
        `SELECT reason, retry_status AS retryStatus, COUNT(*) AS count
           FROM unresolved_messages
          GROUP BY reason, retry_status`,
      )
      .all() as Array<{ reason: UnresolvedReason; retryStatus: UnresolvedRetryStatus; count: number | bigint }>;
    const counts = { pending: 0, unmatched: 0, ambiguous: 0, decodeFailed: 0, currentTeam: 0, imported: 0 };
    for (const row of rows) {
      const n = Number(row.count);
      if (row.retryStatus === "imported") {
        counts.imported += n;
        continue;
      }
      counts.pending += n;
      if (row.reason === "unmatched") counts.unmatched += n;
      else if (row.reason === "ambiguous") counts.ambiguous += n;
      else if (row.reason === "current_team") counts.currentTeam += n;
      else counts.decodeFailed += n;
    }
    return counts;
  }

  bumpUnresolvedAttempt(guid: string, reason: UnresolvedReason, now: string): void {
    this.db
      .prepare(
        `UPDATE unresolved_messages
            SET reason = ?, last_tried_at = ?, attempt_count = attempt_count + 1
          WHERE guid = ? AND retry_status = 'pending'`,
      )
      .run(reason, now, guid);
  }
}

export function openSyncStore(home: string): AppleMessagesSyncStore {
  return new AppleMessagesSyncStore(home);
}
