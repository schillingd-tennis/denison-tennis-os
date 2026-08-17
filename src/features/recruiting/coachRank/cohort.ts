import type { RecruitDirectoryRow } from "../directory";

import {
  denseRankByPersonId,
  isDenseCoachRankSequence,
  masterRankedPersonIds,
} from "./engine";

/**
 * Apply a dense 1…N Coach Rank order to one class year in a directory cohort.
 * Person IDs not listed in that class become unranked. Other class years are
 * left untouched.
 */
export function applyCoachRanksToCohort(
  cohort: readonly RecruitDirectoryRow[],
  classYear: number,
  rankedPersonIds: readonly string[],
): RecruitDirectoryRow[] {
  const rankById = denseRankByPersonId(rankedPersonIds);
  return cohort.map((row) => {
    if (row.profile.recruitClassYear !== classYear) return row;
    const nextRank = rankById.get(row.person.id);
    if (row.profile.coachRank === nextRank) return row;
    return {
      ...row,
      profile: {
        ...row.profile,
        coachRank: nextRank,
      },
    };
  });
}

function rankedEntriesForClass(
  cohort: readonly RecruitDirectoryRow[],
  classYear: number,
): { personId: string; coachRank: number }[] {
  return cohort
    .filter(
      (row) =>
        row.profile.recruitClassYear === classYear && row.profile.coachRank !== undefined,
    )
    .map((row) => ({
      personId: row.person.id,
      coachRank: row.profile.coachRank as number,
    }));
}

/** Ordered ranked IDs for one class, from stored ranks (relative order only). */
export function rankedPersonIdsForClass(
  cohort: readonly RecruitDirectoryRow[],
  classYear: number,
): string[] {
  return masterRankedPersonIds(rankedEntriesForClass(cohort, classYear));
}

/**
 * Rebuild 1…N from the class's current relative ranked order.
 * Does not reorder recruits — only densifies stored numbers.
 */
export function densifyExistingClassOrder(
  cohort: readonly RecruitDirectoryRow[],
  classYear: number,
): {
  rows: RecruitDirectoryRow[];
  rankedPersonIds: string[];
  changed: boolean;
} {
  const entries = rankedEntriesForClass(cohort, classYear);
  const rankedPersonIds = masterRankedPersonIds(entries);
  const changed = !isDenseCoachRankSequence(entries.map((entry) => entry.coachRank));
  return {
    rankedPersonIds,
    changed,
    rows: changed ? applyCoachRanksToCohort(cohort, classYear, rankedPersonIds) : [...cohort],
  };
}
