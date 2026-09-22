/** Official Matches module — domain types (separate from Intra Squad). */

export const MATCH_EVENT_TYPES = ["dual", "tournament"] as const;
export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];

export const MATCH_SITES = ["home", "away", "neutral"] as const;
export type MatchSite = (typeof MATCH_SITES)[number];

export const MATCH_SEASON_SEGMENTS = ["fall", "spring", "postseason"] as const;
export type MatchSeasonSegment = (typeof MATCH_SEASON_SEGMENTS)[number];

export const MATCH_EVENT_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "unfinished",
] as const;
export type MatchEventStatus = (typeof MATCH_EVENT_STATUSES)[number];

export const MATCH_SCORING_FORMATS = ["ncaa_standard", "doubles_separate", "custom"] as const;
export type MatchScoringFormat = (typeof MATCH_SCORING_FORMATS)[number];

export const TEAM_OUTCOMES = ["win", "loss", "tie"] as const;
export type TeamOutcome = (typeof TEAM_OUTCOMES)[number];

export const MATCH_DISCIPLINES = ["singles", "doubles"] as const;
export type MatchDiscipline = (typeof MATCH_DISCIPLINES)[number];

export const MATCH_RESULT_KINDS = ["dual_lineup", "tournament_match"] as const;
export type MatchResultKind = (typeof MATCH_RESULT_KINDS)[number];

export const MATCH_RESULT_STATUSES = [
  "completed",
  "retired",
  "walkover",
  "default",
  "unfinished",
  "cancelled",
  "bye",
] as const;
export type MatchResultStatus = (typeof MATCH_RESULT_STATUSES)[number];

export const WINNER_SIDES = ["denison", "opponent", "unknown"] as const;
export type WinnerSide = (typeof WINNER_SIDES)[number];

export const TEAM_POINT_SIDES = ["denison", "opponent", "none"] as const;
export type TeamPointSide = (typeof TEAM_POINT_SIDES)[number];

export const MATCHES_TABS = [
  "team",
  "players",
  "doubles-players",
  "doubles-teams",
  "results",
] as const;
export type MatchesTab = (typeof MATCHES_TABS)[number];

export const MATCHES_TAB_LABELS: Record<MatchesTab, string> = {
  team: "Team",
  players: "Players",
  "doubles-players": "Doubles Players",
  "doubles-teams": "Doubles Teams",
  results: "Results",
};

export const EVENT_TYPE_FILTERS = ["all", "dual", "tournament"] as const;
export type EventTypeFilter = (typeof EVENT_TYPE_FILTERS)[number];

export type ScoreSet = {
  winnerGames: number;
  loserGames: number;
  /** Tiebreak points won by the set winner when present (e.g. 7-6(5)). */
  winnerTb?: number | null;
  loserTb?: number | null;
  /** Match tiebreak / super TB as a final set. */
  isMatchTiebreak?: boolean;
};

export type RosterPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  classYear?: number;
};

export type MatchDoublesPair = {
  id: string;
  playerAId: string;
  playerBId: string;
  pairKey: string;
  createdAt: string;
};

/** Provenance-only copy of Schedule identity at import/link time. */
export type ScheduleEventSnapshot = {
  id: string;
  eventType: string;
  opponentName: string | null;
  eventName: string | null;
  seasonYear: number;
  seasonSegment: MatchSeasonSegment | null;
  startDate: string;
  endDate: string;
  siteDesignation: MatchSite | null;
  venueName: string | null;
  locationText: string | null;
  city: string | null;
  state: string | null;
  capturedAt: string;
};

export type ScheduleUnlinkedReason = "manual" | "schedule_deleted" | "never_linked";

export type MatchEvent = {
  id: string;
  eventType: MatchEventType;
  /** Snapshot / legacy fields — prefer live Schedule via scheduleEventId for display. */
  title: string;
  opposingTeamName: string | null;
  seasonYear: number;
  seasonSegment: MatchSeasonSegment | null;
  startDate: string;
  endDate: string | null;
  site: MatchSite | null;
  locationText: string | null;
  venueName: string | null;
  status: MatchEventStatus;
  scoringFormat: MatchScoringFormat | null;
  reportedTeamScoreDenison: number | null;
  reportedTeamScoreOpponent: number | null;
  calculatedTeamScoreDenison: number | null;
  calculatedTeamScoreOpponent: number | null;
  teamOutcome: TeamOutcome | null;
  teamScoreDiscrepancy: boolean;
  scheduleEventId: string | null;
  scheduleSnapshot: ScheduleEventSnapshot | null;
  scheduleUnlinkedReason: ScheduleUnlinkedReason | null;
  /**
   * Explicit admin “Mark results complete”. Null = not complete (Awaiting/Partial).
   * Never inferred from team score or a single result.
   */
  resultsMarkedCompleteAt: string | null;
  resultsMarkedCompleteBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchResult = {
  id: string;
  eventId: string;
  discipline: MatchDiscipline;
  resultKind: MatchResultKind;
  lineupPosition: number | null;
  drawName: string | null;
  flightName: string | null;
  divisionName: string | null;
  roundLabel: string | null;
  matchDate: string | null;
  status: MatchResultStatus;
  winnerSide: WinnerSide | null;
  scoreText: string | null;
  scoreSets: ScoreSet[];
  originalScoreText: string | null;
  sourceExcerpt: string | null;
  notes: string | null;
  denisonPlayerAId: string | null;
  denisonPlayerBId: string | null;
  doublesPairId: string | null;
  opponentPlayerAName: string | null;
  opponentPlayerBName: string | null;
  opponentSchool: string | null;
  countsTowardTeamPoint: boolean;
  teamPointAwardedTo: TeamPointSide | null;
  importFingerprint: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchImportBatch = {
  id: string;
  eventId: string | null;
  eventType: MatchEventType | null;
  scheduleEventId: string | null;
  detectionMethod: "auto" | "user_dual" | "user_tournament";
  sourceText: string;
  draftJson: unknown;
  status: "draft" | "confirmed" | "failed";
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Draft row before Person IDs are fully resolved / saved. */
export type DraftParticipantRef = {
  rawName: string;
  personId: string | null;
  resolution: "resolved" | "ambiguous" | "unknown" | "manual";
  candidateIds?: string[];
};

export type DualDraftLineResult = {
  discipline: MatchDiscipline;
  lineupPosition: number | null;
  denisonA: DraftParticipantRef;
  denisonB: DraftParticipantRef | null;
  opponentAName: string | null;
  opponentBName: string | null;
  opponentSchool: string | null;
  status: MatchResultStatus;
  winnerSide: WinnerSide | null;
  scoreText: string | null;
  scoreSets: ScoreSet[];
  originalScoreText: string | null;
  sourceExcerpt: string;
  countsTowardTeamPoint: boolean;
  teamPointAwardedTo: TeamPointSide | null;
  flags: string[];
};

export type DualImportDraft = {
  kind: "dual";
  opposingTeamName: string | null;
  seasonYear: number | null;
  seasonSegment: MatchSeasonSegment | null;
  startDate: string | null;
  site: MatchSite | null;
  locationText: string | null;
  venueName: string | null;
  scoringFormat: MatchScoringFormat;
  reportedTeamScoreDenison: number | null;
  reportedTeamScoreOpponent: number | null;
  calculatedTeamScoreDenison: number | null;
  calculatedTeamScoreOpponent: number | null;
  teamOutcome: TeamOutcome | null;
  teamScoreDiscrepancy: boolean;
  results: DualDraftLineResult[];
  confidence: number;
  interpretation: string;
  flags: string[];
};

export type TournamentDraftResult = {
  discipline: MatchDiscipline;
  drawName: string | null;
  flightName: string | null;
  divisionName: string | null;
  roundLabel: string | null;
  matchDate: string | null;
  denisonA: DraftParticipantRef;
  denisonB: DraftParticipantRef | null;
  opponentAName: string | null;
  opponentBName: string | null;
  opponentSchool: string | null;
  status: MatchResultStatus;
  winnerSide: WinnerSide | null;
  scoreText: string | null;
  scoreSets: ScoreSet[];
  originalScoreText: string | null;
  sourceExcerpt: string;
  flags: string[];
};

export type TournamentImportDraft = {
  kind: "tournament";
  title: string | null;
  seasonYear: number | null;
  seasonSegment: MatchSeasonSegment | null;
  startDate: string | null;
  endDate: string | null;
  locationText: string | null;
  results: TournamentDraftResult[];
  confidence: number;
  interpretation: string;
  flags: string[];
};

export type MatchesImportDraft = DualImportDraft | TournamentImportDraft;

export type WinLossRecord = {
  wins: number;
  losses: number;
  unfinished: number;
  retired: number;
  walkovers: number;
  defaults: number;
  byes: number;
  cancelled: number;
};

export type PlayerSinglesRecord = WinLossRecord & {
  playerId: string;
  dual: WinLossRecord;
  tournament: WinLossRecord;
};

export type PlayerDoublesRecord = WinLossRecord & {
  playerId: string;
  dual: WinLossRecord;
  tournament: WinLossRecord;
};

export type DoublesPairRecord = WinLossRecord & {
  pairKey: string;
  playerAId: string;
  playerBId: string;
  dual: WinLossRecord;
  tournament: WinLossRecord;
};

export type TeamSeasonRecord = {
  seasonYear: number;
  wins: number;
  losses: number;
  ties: number;
};

export const DEFAULT_MATCHES_SEASON_YEAR = 2027;

export const MATCHES_PARSE_UNAVAILABLE =
  "Couldn’t interpret that automatically. Choose Dual or Tournament, correct the fields, or enter results manually.";
