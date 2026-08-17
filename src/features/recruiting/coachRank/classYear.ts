/**
 * Resolve which recruit class year Rank View should use.
 * Filters never create separate rankings — they only narrow visibility.
 */

export type RankClassResolution =
  | { status: "ready"; classYear: number }
  | { status: "choose"; reason: "none" | "multiple" | "none_year" };

/** Active Class Year filter ids look like `classYear:2027` or `classYear:none`. */
export function resolveRankClassYearFromFilters(
  activeFilterIds: readonly string[],
): RankClassResolution {
  const classFilters = activeFilterIds.filter((id) => id.startsWith("classYear:"));
  if (classFilters.length === 0) {
    return { status: "choose", reason: "none" };
  }
  if (classFilters.length > 1) {
    return { status: "choose", reason: "multiple" };
  }
  const raw = classFilters[0].slice("classYear:".length);
  if (raw === "none") {
    return { status: "choose", reason: "none_year" };
  }
  const year = Number(raw);
  if (!Number.isInteger(year)) {
    return { status: "choose", reason: "none" };
  }
  return { status: "ready", classYear: year };
}

export function availableRecruitClassYears(
  rows: readonly { profile: { recruitClassYear?: number } }[],
): number[] {
  return [
    ...new Set(
      rows
        .map((row) => row.profile.recruitClassYear)
        .filter((year): year is number => typeof year === "number"),
    ),
  ].sort((a, b) => a - b);
}
