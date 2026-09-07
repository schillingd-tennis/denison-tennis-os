/** ITA / NPI rankings types — snapshot-first; ready for a future DB/API updater. */

export type RankingGender = "M" | "F";
export type RankingDivision = "DIV3" | "DIV1" | "DIV2" | string;
export type RankingFormat = "TEAM" | "SINGLES" | "DOUBLES" | string;
export type RankingType = "national" | "regional" | "newcomer" | string;

export type RankingSnapshotMetadata = {
  sourceName: string;
  sourceUrl: string;
  /** Authoritative GraphQL endpoint used to retrieve the snapshot, when applicable. */
  apiEndpoint?: string;
  rankListId?: string;
  /** ISO calendar date of the ranking release (YYYY-MM-DD). */
  rankingDate: string;
  season: string;
  gender: RankingGender;
  division: RankingDivision;
  format: RankingFormat;
  rankingType: RankingType;
  listType?: string;
  /** ISO timestamp when this snapshot was retrieved. */
  retrievedAt: string;
  totalRankedTeams: number;
};

export type RankingEntry = {
  /** Official rank; ties share the same value. */
  rank: number;
  /** Official school/team display name from the source. */
  schoolName: string;
  /** Stable source team id when provided. */
  schoolId?: string;
  /** Previous rank when the source publishes one. */
  previousRank?: number | null;
  wins?: number | null;
  losses?: number | null;
  points?: number | null;
  /** Official team-average World Tennis Number displayed with the ranking list. */
  wtn?: number | null;
  conferenceKey?: string | null;
  conference?: string | null;
  region?: string | null;
};

export type RankingSnapshot = {
  metadata: RankingSnapshotMetadata;
  entries: RankingEntry[];
};

export type RankingsSubmoduleId =
  | "current-ita"
  | "live-ita"
  | "current-npi"
  | "live-npi";

export type RankingsSubmodule = {
  id: RankingsSubmoduleId;
  label: string;
  href: string;
};

export type SchoolLogoResolution = {
  schoolName: string;
  displayName: string;
  logoSrc: string | null;
  initials: string;
  resolved: boolean;
  isDenison: boolean;
};
