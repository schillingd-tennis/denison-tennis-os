import { normalizeRankingSchoolName } from "./schoolLogos";
import type { RankingSnapshot } from "./types";

export type CurrentTeamRanking = {
  rank: number;
  rankingDate: string;
};

export function currentTeamRanking(
  snapshot: RankingSnapshot,
  schoolName: string,
): CurrentTeamRanking | null {
  const normalizedSchoolName = normalizeRankingSchoolName(schoolName);
  const entry = snapshot.entries.find(
    (candidate) => normalizeRankingSchoolName(candidate.schoolName) === normalizedSchoolName,
  );

  return entry
    ? { rank: entry.rank, rankingDate: snapshot.metadata.rankingDate }
    : null;
}
