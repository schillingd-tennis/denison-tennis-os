/**
 * Directory KPI counts (BP-045). Presentation only — does not persist analytics.
 */
import type { RecruitDirectoryRow } from "./directory";
import { RECRUIT_OUTCOME_KEYS, RECRUIT_PRIORITY_KEYS } from "./lookupSeed";
import type { RecruitProfile } from "./types";

export type RecruitingDirectoryKpis = {
  /** Current recruiting cohort (role Recruit + Recruit Profile). */
  totalRecruits: number;
  /** Current recruits whose coach Priority is Elite (`1 - Elite`). */
  priority1Recruits: number;
  /**
   * Recruit Profiles with Outcome = Committed to Denison.
   * Includes historical profiles on People who are now Players.
   */
  commits: number;
};

export function countDenisonCommitProfiles(profiles: readonly RecruitProfile[]): number {
  return profiles.filter((profile) => profile.outcome?.key === RECRUIT_OUTCOME_KEYS.committedDenison)
    .length;
}

export function computeRecruitingDirectoryKpis(
  rows: readonly RecruitDirectoryRow[],
  denisonCommits: number,
): RecruitingDirectoryKpis {
  let priority1Recruits = 0;
  for (const row of rows) {
    if (row.profile.priority?.key === RECRUIT_PRIORITY_KEYS.elite) priority1Recruits += 1;
  }
  return {
    totalRecruits: rows.length,
    priority1Recruits,
    commits: denisonCommits,
  };
}
