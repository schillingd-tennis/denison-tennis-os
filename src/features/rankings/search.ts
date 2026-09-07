import type { RankingEntry } from "./types";

/** Case-insensitive school/conference search that preserves official rank order. */
export function filterRankingEntries(
  entries: readonly RankingEntry[],
  query: string,
): RankingEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...entries];
  return entries.filter((entry) => {
    const haystack = [
      entry.schoolName,
      entry.conference ?? "",
      entry.region ?? "",
      String(entry.rank),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
