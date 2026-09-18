import {
  attachWhatsAppRecruit,
  classifyWhatsAppMessage,
  dedupeBySourceKey,
  matchWhatsAppHandle,
  partitionWhatsAppUpserts,
  whatsappTimestampToIso,
  type WhatsAppMessageRow,
  type WhatsAppProposedInteraction,
} from "../whatsapp";
import type { RecruitMatchInput } from "../appleMessages";

export type WhatsAppMatchContext = {
  recruits: RecruitMatchInput[];
  contacts: Map<string, Set<string>>;
  overrides: Record<string, string>;
  /** Explicit conversation → recruit overrides (manual selection). */
  conversationSelections?: Record<string, string>;
};

export type ImportConversationResult = {
  importable: WhatsAppProposedInteraction[];
  skipped: number;
  unmatched: number;
  ambiguous: number;
  duplicates: number;
  groupsExcluded: number;
  alreadyExisting: number;
};

/**
 * Classify, match, and prepare WhatsApp rows for upsert.
 * Groups never auto-import. Ambiguous handles require review (never name-only attach).
 * Explicit conversationSelections allow importing one selected conversation.
 */
export function prepareWhatsAppImport(
  rows: WhatsAppMessageRow[],
  context: WhatsAppMatchContext,
  existingKeys: Iterable<string> = [],
): ImportConversationResult {
  const importable: WhatsAppProposedInteraction[] = [];
  let skipped = 0;
  let unmatched = 0;
  let ambiguous = 0;
  let groupsExcluded = 0;

  for (const row of rows) {
    const classified = classifyWhatsAppMessage(row);
    if (classified.status === "skip") {
      if (classified.reason === "group") groupsExcluded += 1;
      else skipped += 1;
      continue;
    }

    const selection = context.conversationSelections?.[row.conversationId];
    if (selection) {
      const recruit = context.recruits.find((item) => item.id === selection);
      if (recruit) {
        importable.push(
          attachWhatsAppRecruit(classified.record, {
            recruitId: recruit.id,
            name: recruit.name,
            handle: classified.handle,
            source: "override",
          }),
        );
        continue;
      }
    }

    const resolved = matchWhatsAppHandle(classified.handle, context);
    if (resolved.status === "matched") {
      importable.push(attachWhatsAppRecruit(classified.record, resolved.match));
      continue;
    }
    if (resolved.status === "ambiguous") {
      ambiguous += 1;
      continue;
    }
    unmatched += 1;
  }

  const { unique, duplicateKeys } = dedupeBySourceKey(importable);
  const partitioned = partitionWhatsAppUpserts(unique, existingKeys);

  return {
    importable: partitioned.toInsert,
    skipped,
    unmatched,
    ambiguous,
    duplicates: duplicateKeys.length + partitioned.alreadyExisting.length,
    groupsExcluded,
    alreadyExisting: partitioned.alreadyExisting.length,
  };
}

/** Incremental: keep messages newer than cursor timestamp, or unseen message ids. */
export function selectIncrementalMessages(
  rows: WhatsAppMessageRow[],
  cursor: { lastMessageId: string | null; lastTimestamp: number | null },
): WhatsAppMessageRow[] {
  if (cursor.lastTimestamp == null && !cursor.lastMessageId) return rows;
  return rows.filter((row) => {
    if (cursor.lastTimestamp != null && row.timestamp > cursor.lastTimestamp) return true;
    if (
      cursor.lastTimestamp != null &&
      row.timestamp === cursor.lastTimestamp &&
      cursor.lastMessageId &&
      row.messageId !== cursor.lastMessageId
    ) {
      return true;
    }
    if (cursor.lastTimestamp == null && cursor.lastMessageId) {
      return row.messageId !== cursor.lastMessageId;
    }
    return false;
  });
}

/**
 * Forward-only floor: keep messages at or after `importFromAt` (ISO).
 * Messages strictly before the cutoff are skipped even if WhatsApp replays history.
 */
export function selectMessagesAfterCutoff(
  rows: WhatsAppMessageRow[],
  importFromAt: string | null | undefined,
): WhatsAppMessageRow[] {
  if (!importFromAt) return rows;
  const cutoffMs = Date.parse(importFromAt);
  if (Number.isNaN(cutoffMs)) return rows;
  return rows.filter((row) => {
    const iso = whatsappTimestampToIso(row.timestamp);
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return false;
    return ms >= cutoffMs;
  });
}

/** Apply cutoff then per-conversation cursor for every import path. */
export function selectForwardImportMessages(
  rows: WhatsAppMessageRow[],
  options: {
    importFromAt: string | null | undefined;
    cursor: { lastMessageId: string | null; lastTimestamp: number | null };
  },
): WhatsAppMessageRow[] {
  const afterCutoff = selectMessagesAfterCutoff(rows, options.importFromAt);
  return selectIncrementalMessages(afterCutoff, options.cursor);
}

export function maxCursorFromRows(rows: WhatsAppMessageRow[]): {
  lastMessageId: string | null;
  lastTimestamp: number | null;
} {
  if (rows.length === 0) return { lastMessageId: null, lastTimestamp: null };
  let best = rows[0]!;
  for (const row of rows) {
    if (row.timestamp > best.timestamp) best = row;
    else if (row.timestamp === best.timestamp && row.messageId > best.messageId) best = row;
  }
  return { lastMessageId: best.messageId, lastTimestamp: best.timestamp };
}
