import { APPLE_MESSAGES_SOURCE_SYSTEM, attachRecruit, type ProposedInteraction } from "../appleMessages";

import {
  buildHandleMatchReport,
  classifyScanRow,
  matchHandle,
  selectForwardMessages,
  scanRowId,
  type AppleScanRow,
  type ScanMatchContext,
} from "./scan";
import type { AppleMessagesSyncStore, UnresolvedMessage, UnresolvedWrite } from "./store";

export type MessagesCatalog = {
  maxRowId(): number | null;
  messagesAfter(rowId: number): AppleScanRow[];
};

export type BaselineResult = {
  importedCount: 0;
  baselineRowId: number;
  activationAt: string;
};

export type ScanPassResult = {
  importable: ProposedInteraction[];
  unresolved: UnresolvedWrite[];
  excluded: number;
  lastScannedRowId: number;
};

export class BaselineRequiredError extends Error {
  constructor() {
    super("Apple Messages production sync requires a local baseline before any import.");
    this.name = "BaselineRequiredError";
  }
}

export class BaselineAlreadyExistsError extends Error {
  constructor() {
    super("A local Apple Messages baseline already exists.");
    this.name = "BaselineAlreadyExistsError";
  }
}

export function recordBaseline(
  store: AppleMessagesSyncStore,
  catalog: MessagesCatalog,
  now: Date = new Date(),
): BaselineResult {
  if (store.hasBaseline()) throw new BaselineAlreadyExistsError();
  const maxRowId = catalog.maxRowId() ?? 0;
  const activationAt = now.toISOString();
  store.writeBaseline({ maxRowId, activationAt });
  return { importedCount: 0, baselineRowId: maxRowId, activationAt };
}

export function requireBaseline(store: AppleMessagesSyncStore): void {
  if (!store.hasBaseline()) throw new BaselineRequiredError();
}

export function scanForward(
  store: AppleMessagesSyncStore,
  catalog: MessagesCatalog,
  context: ScanMatchContext,
  now: Date = new Date(),
): ScanPassResult {
  requireBaseline(store);
  const state = store.readState();
  const lastScannedRowId = state.lastScannedRowId ?? state.baselineRowId ?? 0;
  const activationAt = state.activationAt!;
  const fetched = catalog.messagesAfter(lastScannedRowId);
  const nextCursor = fetched.reduce((max, row) => Math.max(max, scanRowId(row)), lastScannedRowId);
  const forward = selectForwardMessages(fetched, { lastScannedRowId, activationAt });
  const classified = forward.map((row) => ({ row, classified: classifyScanRow(row) }));
  const handles = classified
    .map((item) => (item.classified.kind === "candidate" ? item.classified.handle : ""))
    .filter(Boolean);
  const report = buildHandleMatchReport(handles, context);

  const importable: ProposedInteraction[] = [];
  const unresolved: UnresolvedWrite[] = [];
  let excluded = 0;
  const nowIso = now.toISOString();

  for (const item of classified) {
    const classified = item.classified;
    if (classified.kind === "excluded") {
      excluded += 1;
      continue;
    }
    if (classified.kind === "decode_failed") {
      const write: UnresolvedWrite = {
        guid: classified.guid,
        rowId: scanRowId(item.row),
        appleDate: classified.appleDate,
        handle: classified.handle,
        reason: "decode_failed",
      };
      unresolved.push(write);
      store.upsertUnresolved(write, nowIso);
      continue;
    }
    const match = matchHandle(classified.handle, report);
    if (match.status === "matched") {
      importable.push(attachRecruit(classified.parsed, match.match));
      continue;
    }
    const write: UnresolvedWrite = {
      guid: classified.guid,
      rowId: scanRowId(item.row),
      appleDate: classified.appleDate,
      handle: classified.handle,
      reason: match.status === "ambiguous" ? "ambiguous" : "unmatched",
    };
    unresolved.push(write);
    store.upsertUnresolved(write, nowIso);
  }

  if (nextCursor > lastScannedRowId) store.setLastScannedRowId(nextCursor);
  return { importable, unresolved, excluded, lastScannedRowId: nextCursor };
}

export function retryUnresolved(
  store: AppleMessagesSyncStore,
  context: ScanMatchContext,
  now: Date = new Date(),
  options: { persistImported?: boolean } = {},
): { newlyMatched: ProposedInteraction[]; stillPending: UnresolvedMessage[] } {
  requireBaseline(store);
  const persistImported = options.persistImported !== false;
  const pending = store.listPendingUnresolved();
  if (pending.length === 0) return { newlyMatched: [], stillPending: [] };
  const report = buildHandleMatchReport(
    pending.map((row) => row.handle),
    context,
  );
  const nowIso = now.toISOString();
  const newlyMatched: ProposedInteraction[] = [];
  const stillPending: UnresolvedMessage[] = [];

  for (const row of pending) {
    if (row.reason === "decode_failed") {
      store.bumpUnresolvedAttempt(row.guid, "decode_failed", nowIso);
      stillPending.push({ ...row, attemptCount: row.attemptCount + 1, lastTriedAt: nowIso });
      continue;
    }
    const match = matchHandle(row.handle, report);
    if (match.status === "matched") {
      newlyMatched.push(
        attachRecruit(
          {
            recruit_person_id: "",
            tournament_id: null,
            occurred_at: row.appleDate,
            interaction_type: "text",
            channel: null,
            direction: "inbound",
            participants: row.handle,
            notes: "",
            next_steps: null,
            logged_by: null,
            source_system: APPLE_MESSAGES_SOURCE_SYSTEM,
            source_key: row.guid,
          },
          match.match,
        ),
      );
      if (persistImported) store.markUnresolvedImported(row.guid, nowIso);
      continue;
    }
    const reason = match.status === "ambiguous" ? "ambiguous" : "unmatched";
    store.bumpUnresolvedAttempt(row.guid, reason, nowIso);
    stillPending.push({
      ...row,
      reason,
      attemptCount: row.attemptCount + 1,
      lastTriedAt: nowIso,
    });
  }

  return { newlyMatched, stillPending };
}
