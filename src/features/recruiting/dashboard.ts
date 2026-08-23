import type { RecruitInteraction } from "@/features/interactions/types";
import { getDisplayName } from "@/features/people/utils";
import { partitionTournamentsBySchedule } from "@/features/tournaments/location";
import type { Tournament } from "@/features/tournaments/types";

import type { DenisonCommitRecruit, RecruitDirectoryRow } from "./directory";

export const DASHBOARD_RECENT_INTERACTION_LIMIT = 10;
export const DASHBOARD_TOP_RANKED_LIMIT = 5;
export const DASHBOARD_UPCOMING_TOURNAMENT_LIMIT = 5;
/** Dashboard Denison Commits (KPI + card) show this recruiting class only. */
export const DASHBOARD_COMMIT_CLASS_YEAR = 2027;

export function recentInteractions(
  interactions: readonly RecruitInteraction[],
  limit = DASHBOARD_RECENT_INTERACTION_LIMIT,
): RecruitInteraction[] {
  return [...interactions]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

export type RankedDashboardRecruit = {
  personId: string;
  name: string;
  coachRank: number;
  classYear?: number;
  utr?: number;
  trnRank?: number;
};

/** Same Coach Rank order as Recruit List > Rank (not UTR / TRN). */
export function topRankedRecruits(
  rows: readonly RecruitDirectoryRow[],
  limit = DASHBOARD_TOP_RANKED_LIMIT,
): RankedDashboardRecruit[] {
  return rows
    .filter((row) => row.profile.coachRank !== undefined)
    .sort((a, b) => {
      const rank = (a.profile.coachRank as number) - (b.profile.coachRank as number);
      if (rank !== 0) return rank;
      const year = (a.profile.recruitClassYear ?? 9999) - (b.profile.recruitClassYear ?? 9999);
      if (year !== 0) return year;
      return getDisplayName(a.person).localeCompare(getDisplayName(b.person));
    })
    .slice(0, limit)
    .map((row) => ({
      personId: row.person.id,
      name: getDisplayName(row.person),
      coachRank: row.profile.coachRank as number,
      classYear: row.profile.recruitClassYear,
      utr: row.person.utr,
      trnRank: row.person.trnRank,
    }));
}

export function upcomingTournaments(
  tournaments: readonly Tournament[],
  limit = DASHBOARD_UPCOMING_TOURNAMENT_LIMIT,
): Tournament[] {
  return partitionTournamentsBySchedule(tournaments).upcoming.slice(0, limit);
}

export function denisonCommitSummary(commits: readonly DenisonCommitRecruit[]): {
  count: number;
  recruits: DenisonCommitRecruit[];
} {
  const recruits = commits.filter((recruit) => recruit.classYear === DASHBOARD_COMMIT_CLASS_YEAR);
  return { count: recruits.length, recruits };
}
