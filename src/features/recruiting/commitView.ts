/**
 * Commit View row selection (Phase C.13).
 * Outcome is the source of truth — not pipeline stage or schoolChosen presence.
 */
import type { RecruitDirectoryRow } from "./directory";
import { RECRUIT_OUTCOME_KEYS } from "./lookupSeed";

export function isCommittedRecruit(row: RecruitDirectoryRow): boolean {
  const key = row.profile.outcome?.key;
  return (
    key === RECRUIT_OUTCOME_KEYS.committedDenison ||
    key === RECRUIT_OUTCOME_KEYS.committedElsewhere
  );
}

/** Rows eligible for Commit View after directory filters/search. */
export function filterCommitDirectoryRows(
  rows: readonly RecruitDirectoryRow[],
): RecruitDirectoryRow[] {
  return rows.filter(isCommittedRecruit);
}
