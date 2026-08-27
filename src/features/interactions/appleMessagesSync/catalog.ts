import { DatabaseSync } from "node:sqlite";

import { scanRowId, type AppleScanRow } from "./scan";
import type { MessagesCatalog } from "./engine";

/**
 * Read-only catalog over a copied chat.db. Callers must copy the live
 * Messages database (and WAL/SHM) before constructing this.
 */
export class SqliteMessagesCatalog implements MessagesCatalog {
  constructor(private readonly db: DatabaseSync) {}

  static open(path: string): SqliteMessagesCatalog {
    const db = new DatabaseSync(path, { readOnly: true });
    return new SqliteMessagesCatalog(db);
  }

  close(): void {
    this.db.close();
  }

  maxRowId(): number | null {
    const row = this.db.prepare(`SELECT MAX(ROWID) AS maxRowId FROM message`).get() as
      | { maxRowId: number | bigint | null }
      | undefined;
    if (row?.maxRowId == null) return null;
    return Number(row.maxRowId);
  }

  messagesAfter(rowId: number): AppleScanRow[] {
    const stmt = this.db.prepare(
      `SELECT m.ROWID AS rowId,
              m.guid AS guid,
              c.chat_identifier AS chatIdentifier,
              m.is_from_me AS isFromMe,
              m.date AS date,
              m.text AS text,
              m.attributedBody AS attributedBody,
              m.associated_message_type AS associatedMessageType,
              c.service_name AS serviceName,
              CASE WHEN m.cache_has_attachments = 1 THEN 1 ELSE 0 END AS hasAttachments
         FROM message m
         JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
         JOIN chat c ON c.ROWID = cmj.chat_id
        WHERE m.ROWID > ?
        ORDER BY m.ROWID ASC`,
    );
    stmt.setReadBigInts(true);
    return (stmt.all(rowId) as AppleScanRow[]).map((row) => ({
      ...row,
      rowId: Number(row.rowId),
      hasAttachments: Number(row.hasAttachments) === 1,
    }));
  }

  messageByGuid(guid: string): AppleScanRow | null {
    const key = guid.trim();
    if (!key) return null;
    const stmt = this.db.prepare(
      `SELECT m.ROWID AS rowId,
              m.guid AS guid,
              c.chat_identifier AS chatIdentifier,
              m.is_from_me AS isFromMe,
              m.date AS date,
              m.text AS text,
              m.attributedBody AS attributedBody,
              m.associated_message_type AS associatedMessageType,
              c.service_name AS serviceName,
              CASE WHEN m.cache_has_attachments = 1 THEN 1 ELSE 0 END AS hasAttachments
         FROM message m
         JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
         JOIN chat c ON c.ROWID = cmj.chat_id
        WHERE m.guid = ?
        ORDER BY CASE WHEN c.chat_identifier LIKE 'chat%' THEN 1 ELSE 0 END, m.ROWID DESC
        LIMIT 1`,
    );
    stmt.setReadBigInts(true);
    const row = stmt.get(key) as AppleScanRow | undefined;
    if (!row) return null;
    return {
      ...row,
      rowId: Number(row.rowId),
      hasAttachments: Number(row.hasAttachments) === 1,
    };
  }
}

export class MemoryMessagesCatalog implements MessagesCatalog {
  constructor(readonly rows: AppleScanRow[]) {}

  maxRowId(): number | null {
    if (this.rows.length === 0) return 0;
    return this.rows.reduce((max, row) => Math.max(max, scanRowId(row)), 0);
  }

  messagesAfter(rowId: number): AppleScanRow[] {
    return this.rows
      .filter((row) => scanRowId(row) > rowId)
      .sort((a, b) => scanRowId(a) - scanRowId(b));
  }

  messageByGuid(guid: string): AppleScanRow | null {
    const key = guid.trim();
    return this.rows.find((row) => row.guid === key) ?? null;
  }
}
