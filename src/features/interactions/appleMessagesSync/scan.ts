import {
  APPLE_MESSAGES_SOURCE_SYSTEM,
  appleTimestampToIso,
  classifyAppleMessage,
  decodeAttributedBody,
  isEmptyMessage,
  matchRecruitsToThreads,
  messageBody,
  type AppleMessageRow,
  type MatchReport,
  type MatchedThread,
  type ProposedInteraction,
  type RecruitMatchInput,
} from "../appleMessages";

import type { UnresolvedReason } from "./store";

export type AppleScanRow = AppleMessageRow & { rowId: number | bigint };

export function scanRowId(row: Pick<AppleScanRow, "rowId">): number {
  return typeof row.rowId === "bigint" ? Number(row.rowId) : row.rowId;
}

export type ScanMatchContext = {
  recruits: RecruitMatchInput[];
  contacts: Map<string, Set<string>>;
  overrides: Record<string, string>;
};

export type ForwardSelectOptions = {
  lastScannedRowId: number;
  activationAt: string;
};

export type ClassifiedScan =
  | { kind: "excluded"; reason: "group" | "tapback" | "empty" | "no_guid" | "invalid_handle" }
  | { kind: "decode_failed"; guid: string; handle: string; appleDate: string }
  | { kind: "candidate"; parsed: ProposedInteraction; handle: string; guid: string; appleDate: string };

export function isForwardCandidate(row: AppleScanRow, options: ForwardSelectOptions): boolean {
  if (scanRowId(row) <= options.lastScannedRowId) return false;
  return appleTimestampToIso(row.date) > options.activationAt;
}

export function selectForwardMessages(rows: AppleScanRow[], options: ForwardSelectOptions): AppleScanRow[] {
  return rows.filter((row) => isForwardCandidate(row, options));
}

function hasAttributedBlob(buf: unknown): boolean {
  if (buf == null) return false;
  if (typeof buf === "string") return buf.length > 0;
  if (buf instanceof Uint8Array || Buffer.isBuffer(buf)) return buf.length > 0;
  return true;
}

export function classifyScanRow(row: AppleScanRow): ClassifiedScan {
  const classified = classifyAppleMessage(row);
  if (classified.status === "ok") {
    return {
      kind: "candidate",
      parsed: classified.record,
      handle: classified.handle,
      guid: classified.record.source_key,
      appleDate: classified.record.occurred_at,
    };
  }

  const text = row.text?.trim() ?? "";
  const decoded = decodeAttributedBody(row.attributedBody);
  const combined = messageBody(row.text, row.attributedBody);
  if (
    classified.reason === "empty" &&
    !text &&
    hasAttributedBlob(row.attributedBody) &&
    isEmptyMessage(decoded) &&
    isEmptyMessage(combined)
  ) {
    const guid = row.guid?.trim();
    const handle = classified.handle;
    if (guid && handle) {
      return {
        kind: "decode_failed",
        guid,
        handle,
        appleDate: appleTimestampToIso(row.date),
      };
    }
  }

  return { kind: "excluded", reason: classified.reason };
}

export function buildHandleMatchReport(handles: Iterable<string>, context: ScanMatchContext): MatchReport {
  return matchRecruitsToThreads({
    recruits: context.recruits,
    threadHandles: handles,
    contacts: context.contacts,
    overrides: context.overrides,
  });
}

export function matchHandle(
  handle: string,
  report: MatchReport,
): { status: "matched"; match: MatchedThread } | { status: "ambiguous" } | { status: "unmatched" } {
  const matched = report.matched.filter((row) => row.handle === handle);
  if (matched.length === 1) return { status: "matched", match: matched[0]! };
  if (matched.length > 1) return { status: "ambiguous" };
  if (report.ambiguous.some((row) => row.handles.includes(handle))) return { status: "ambiguous" };
  return { status: "unmatched" };
}

export function unresolvedReasonForHandle(handle: string, report: MatchReport): UnresolvedReason {
  return matchHandle(handle, report).status === "ambiguous" ? "ambiguous" : "unmatched";
}

void APPLE_MESSAGES_SOURCE_SYSTEM;
