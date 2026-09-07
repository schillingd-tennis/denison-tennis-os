import type { RankingEntry, RankingSnapshot, RankingSnapshotMetadata } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Ranking snapshot invalid: ${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null | undefined {
  if (value == null) return value;
  if (typeof value !== "string") throw new Error("Ranking snapshot invalid: expected string or null");
  return value;
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value == null) return value;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Ranking snapshot invalid: expected finite number or null");
  }
  return value;
}

function parseMetadata(raw: unknown): RankingSnapshotMetadata {
  if (!isObject(raw)) throw new Error("Ranking snapshot invalid: metadata missing");
  const totalRankedTeams = raw.totalRankedTeams;
  if (typeof totalRankedTeams !== "number" || !Number.isInteger(totalRankedTeams) || totalRankedTeams < 0) {
    throw new Error("Ranking snapshot invalid: totalRankedTeams");
  }
  return {
    sourceName: requireString(raw.sourceName, "sourceName"),
    sourceUrl: requireString(raw.sourceUrl, "sourceUrl"),
    apiEndpoint: optionalString(raw.apiEndpoint) ?? undefined,
    rankListId: optionalString(raw.rankListId) ?? undefined,
    rankingDate: requireString(raw.rankingDate, "rankingDate"),
    season: requireString(raw.season, "season"),
    gender: requireString(raw.gender, "gender") as RankingSnapshotMetadata["gender"],
    division: requireString(raw.division, "division"),
    format: requireString(raw.format, "format"),
    rankingType: requireString(raw.rankingType, "rankingType"),
    listType: optionalString(raw.listType) ?? undefined,
    retrievedAt: requireString(raw.retrievedAt, "retrievedAt"),
    totalRankedTeams,
  };
}

function parseEntry(raw: unknown, index: number): RankingEntry {
  if (!isObject(raw)) throw new Error(`Ranking snapshot invalid: entry[${index}]`);
  const rank = raw.rank;
  if (typeof rank !== "number" || !Number.isInteger(rank) || rank < 1) {
    throw new Error(`Ranking snapshot invalid: entry[${index}].rank`);
  }
  return {
    rank,
    schoolName: requireString(raw.schoolName, `entry[${index}].schoolName`),
    schoolId: optionalString(raw.schoolId) ?? undefined,
    previousRank: optionalNumber(raw.previousRank),
    wins: optionalNumber(raw.wins),
    losses: optionalNumber(raw.losses),
    points: optionalNumber(raw.points),
    wtn: optionalNumber(raw.wtn),
    conferenceKey: optionalString(raw.conferenceKey),
    conference: optionalString(raw.conference),
    region: optionalString(raw.region),
  };
}

/**
 * Validate a ranking snapshot. Ties (shared rank values) are allowed.
 * Order is preserved as provided — callers must not re-sort by school name.
 */
export function validateRankingSnapshot(raw: unknown): RankingSnapshot {
  if (!isObject(raw)) throw new Error("Ranking snapshot invalid: root");
  const metadata = parseMetadata(raw.metadata);
  if (!Array.isArray(raw.entries)) throw new Error("Ranking snapshot invalid: entries");
  const entries = raw.entries.map(parseEntry);
  if (entries.length !== metadata.totalRankedTeams) {
    throw new Error(
      `Ranking snapshot invalid: totalRankedTeams (${metadata.totalRankedTeams}) != entries (${entries.length})`,
    );
  }
  // Ranks must be non-decreasing in list order (ties share values; list never goes backwards).
  for (let i = 1; i < entries.length; i += 1) {
    if (entries[i]!.rank < entries[i - 1]!.rank) {
      throw new Error(`Ranking snapshot invalid: rank order broken at index ${i}`);
    }
  }
  return { metadata, entries };
}

export function snapshotHasPreviousRank(snapshot: RankingSnapshot): boolean {
  return snapshot.entries.some((entry) => entry.previousRank != null);
}

export function snapshotHasRecord(snapshot: RankingSnapshot): boolean {
  return snapshot.entries.some((entry) => entry.wins != null || entry.losses != null);
}

export function snapshotHasConferenceOrRegion(snapshot: RankingSnapshot): boolean {
  return snapshot.entries.some(
    (entry) => Boolean(entry.conference?.trim()) || Boolean(entry.region?.trim()),
  );
}
