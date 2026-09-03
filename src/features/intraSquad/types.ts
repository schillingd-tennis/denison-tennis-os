export const INTRA_SQUAD_WEIGHTS = [1, 2, 3] as const;
export type IntraSquadWeight = (typeof INTRA_SQUAD_WEIGHTS)[number];

export const MATCH_STATUSES = ["completed", "unfinished"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export type ScoreSet = {
  winnerGames: number;
  loserGames: number;
};

export type RosterPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  classYear?: number;
};

export type IntraSquadMatch = {
  id: string;
  playedAt: string;
  status: MatchStatus;
  winnerPlayerId: string | null;
  loserPlayerId: string | null;
  leaderPlayerId: string | null;
  trailingPlayerId: string | null;
  scoreText: string;
  scoreSets: ScoreSet[];
  weight: IntraSquadWeight;
  sourceText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntraSquadMatchInput = {
  playedAt: string;
  status: MatchStatus;
  winnerPlayerId: string | null;
  loserPlayerId: string | null;
  leaderPlayerId: string | null;
  trailingPlayerId: string | null;
  scoreText: string;
  scoreSets: ScoreSet[];
  weight: IntraSquadWeight;
  sourceText: string | null;
};

export type PlayerMatchOutcome = "W" | "L" | "leading" | "trailing";

export type PlayerMatchResult = {
  matchId: string;
  playerId: string;
  opponentId: string;
  status: MatchStatus;
  outcome: PlayerMatchOutcome;
  weight: IntraSquadWeight;
  weightedValue: number;
  eloScore: number;
  scoreText: string;
  perspectiveScoreText: string;
  playedAt: string;
};

export type PlayerRecord = {
  playerId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  unfinishedLeading: number;
  unfinishedTrailing: number;
  winPct: number | null;
  weightedWins: number;
  weightedLosses: number;
  weightedNet: number;
};

export type ProvisionalRankingRow = PlayerRecord & {
  rank: number;
};

export type IntraSquadTab =
  | "dashboard"
  | "match-log"
  | "rankings"
  | "player-records"
  | "match-value"
  | "elo";

export const INTRA_SQUAD_TABS: { id: IntraSquadTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "match-log", label: "Match Log" },
  { id: "rankings", label: "Rankings" },
  { id: "player-records", label: "Player Records" },
  { id: "match-value", label: "Match Value" },
  { id: "elo", label: "Elo Rankings" },
];

export const PARSE_ERROR_HINT =
  "Couldn’t determine winner, loser, and score. Try: Arya def. Aidan 6-1, 6-1";

export const UNFINISHED_MISSING_SCORE =
  "Add the current score for the unfinished match.";
