import {
  APPLE_MESSAGES_SOURCE_SYSTEM,
  appleTimestampToIso,
  classifyAppleMessage,
  matchRecruitsToThreads,
  normalizeHandle,
  resolveHandle,
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
  currentTeam?: RecruitMatchInput[];
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
  if (classified.reason === "decode_failed") {
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
  return { kind: "excluded", reason: classified.reason === "decode_failed" ? "empty" : classified.reason };
}

export function buildHandleMatchReport(handles: Iterable<string>, context: ScanMatchContext): MatchReport {
  return matchRecruitsToThreads({
    recruits: context.recruits,
    threadHandles: handles,
    contacts: context.contacts,
    overrides: context.overrides,
  });
}

export function isCurrentTeamHandle(rawHandle: string, currentTeam: readonly RecruitMatchInput[]): boolean {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return false;
  return currentTeam.some((member) =>
    member.osHandles.some((value) => normalizeHandle(value) === handle),
  );
}

export function matchHandle(
  handle: string,
  context: ScanMatchContext,
): { status: "matched"; match: MatchedThread } | { status: "ambiguous" } | { status: "unmatched" } | { status: "current_team" } {
  if (isCurrentTeamHandle(handle, context.currentTeam ?? [])) {
    return { status: "current_team" };
  }
  return resolveHandle(handle, {
    recruits: context.recruits,
    contacts: context.contacts,
    overrides: context.overrides,
  });
}

export function unresolvedReasonForHandle(handle: string, context: ScanMatchContext): UnresolvedReason {
  const status = matchHandle(handle, context).status;
  if (status === "ambiguous") return "ambiguous";
  if (status === "current_team") return "current_team";
  return "unmatched";
}

void APPLE_MESSAGES_SOURCE_SYSTEM;
