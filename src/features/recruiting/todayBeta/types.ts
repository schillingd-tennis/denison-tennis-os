export type MatchResultOutcome = "WIN" | "LOSS" | "UNKNOWN";

export type MatchResultDetectionStatus = "BASELINE" | "NEW";

export type TrnExternalProfile = {
  playerId: string;
  profileUrl: string;
  /** When the coach last reviewed TRN activity for new results. */
  lastCheckedAt?: string;
  /** When match data was last imported via Today Beta. */
  lastImportedAt?: string;
  /** NEW results saved during the most recent check/import (0 for checked-only). */
  lastCheckSavedNewCount?: number;
  /** Set when the first baseline import completes for this recruit. */
  baselineEstablishedAt?: string;
};

export type UtrExternalProfile = {
  playerId: string;
  profileUrl: string;
  resultsUrl: string;
  lastCheckedAt?: string;
  lastImportedAt?: string;
  lastCheckSavedNewCount?: number;
  baselineEstablishedAt?: string;
};

export type UtrAgentCheckStatus =
  | "Checked"
  | "New Results"
  | "Needs Review"
  | "Failed"
  | "Not Configured"
  | "Auth Required";

export type UtrAgentCheckMeta = {
  lastCheckStatus: UtrAgentCheckStatus;
  lastCheckAt?: string;
  lastCheckError?: string;
};

export type ResultsMonitoringStatus = "NEEDS_CHECK" | "CHECKED_TODAY" | "NEW_RESULTS_FOUND";

export type UtrMonitoringSettings = {
  enabled?: boolean;
};

export type UtrAgentBatchRunSummary = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  cohortSize: number;
  configured: number;
  recruitsChecked: number;
  notConfigured: number;
  authRequired: number;
  failed: number;
  matchesAcquired: number;
  matchesProcessed: number;
  matchedExisting: number;
  baselineInserted: number;
  newInserted: number;
  needsReview: number;
  duplicatesIgnored: number;
  averageSecondsPerRecruit: number;
};

export type RecruitExternalProfiles = {
  trn?: TrnExternalProfile;
  utr?: UtrExternalProfile;
  utrAgent?: UtrAgentCheckMeta;
  utrMonitoring?: UtrMonitoringSettings;
  utrAgentLastBatch?: UtrAgentBatchRunSummary;
};

export type RecruitMatchResult = {
  id: string;
  recruitPersonId: string;
  source: string;
  tournamentName?: string;
  /** Normalized ISO date (YYYY-MM-DD) when available. */
  tournamentDate?: string;
  /** Original TRN tournament date text from paste. */
  tournamentDateRaw?: string;
  round?: string;
  opponentName?: string;
  opponentRanking?: string;
  score?: string;
  result: MatchResultOutcome;
  sourceUrl?: string;
  /** Direct tournament/event page URL when known (not the player profile source). */
  tournamentUrl?: string;
  externalMatchId?: string;
  recruitRating?: string;
  opponentRating?: string;
  ratingType?: "UTR" | "TRN";
  firstDetectedAt: string;
  lastVerifiedAt: string;
  detectionStatus: MatchResultDetectionStatus;
  resultFingerprint: string;
  needsReview: boolean;
  parseWarnings: string[];
};

export type ParsedMatchPreview = {
  key: string;
  tournamentName: string;
  tournamentDate: string;
  round: string;
  opponentName: string;
  opponentRanking: string;
  score: string;
  result: MatchResultOutcome;
  warnings: string[];
  needsReview: boolean;
};

export type SaveMatchResultsInput = {
  recruitPersonId: string;
  sourceUrl?: string;
  rows: Array<{
    tournamentName: string;
    tournamentDate: string;
    round: string;
    opponentName: string;
    opponentRanking: string;
    score: string;
    result: MatchResultOutcome;
  }>;
};

export type SaveMatchResultsOutcome = {
  found: number;
  saved: number;
  savedAsBaseline: number;
  savedAsNew: number;
  duplicatesIgnored: number;
  crossSourceMatched: number;
  needsReview: number;
  baselineEstablished: boolean;
  savedResults: RecruitMatchResult[];
  errors: string[];
};

export type UtrCapturedMatch = {
  source: "UTR";
  recruitName: string;
  utrPlayerId: string;
  tournamentName: string;
  matchDate: string;
  round?: string;
  opponentName: string;
  recruitUtr?: string;
  opponentUtr?: string;
  score?: string;
  result?: MatchResultOutcome;
  matchStatus?: string;
  externalMatchId?: string;
  /** Direct UTR event page URL when known. */
  tournamentUrl?: string;
  /** Numeric UTR event id — used to derive tournamentUrl when URL omitted. */
  utrEventId?: string | number;
  needsReview?: boolean;
  parseWarnings?: string[];
  sets?: Array<{
    recruitGames: number;
    opponentGames: number;
    tiebreakPoints?: number | null;
    isMatchTiebreak?: boolean;
  }>;
};

export type SaveUtrCapturedResultsInput = {
  recruitPersonId: string;
  utrPlayerId: string;
  sourceUrl?: string;
  matches: UtrCapturedMatch[];
};

export type TodayBetaPlayerRow = {
  displayName: string;
  recruitPersonId?: string;
  recruitClassYear?: number;
  coachRank?: number;
  trnPlayerId: string;
  trnProfileUrl: string;
  utrPlayerId?: string;
  utrProfileUrl?: string;
  utrResultsUrl?: string;
  /** @deprecated Rank Board membership drives monitoring; this flag is no longer used. */
  utrMonitoringEnabled?: boolean;
  lastCheckedAt?: string;
  lastImportedAt?: string;
  trnLastCheckedAt?: string;
  utrLastCheckedAt?: string;
  utrAgentCheckStatus?: UtrAgentCheckStatus;
  utrAgentCheckAt?: string;
  utrAgentCheckError?: string;
  baselineEstablished: boolean;
  matchesStored: number;
  newResultsCount: number;
  monitoringStatus: ResultsMonitoringStatus;
  recruitPriorityLabel?: string | null;
  status: "Ready" | "Not found" | "Missing recruit";
  matchError?: string;
  upcomingTournaments: RecruitUpcomingTournament[];
};

export type UpcomingTournamentStatus = "UPCOMING" | "COMPLETED" | "CANCELLED";

export type RecruitUpcomingTournament = {
  id: string;
  recruitPersonId: string;
  tournamentName: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  eventType: string | null;
  source: string;
  sourceUrl: string | null;
  notes: string | null;
  status: UpcomingTournamentStatus;
  createdAt: string;
  updatedAt: string;
};

export type RecruitUpcomingTournamentInput = {
  recruitPersonId: string;
  tournamentName: string;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  eventType?: string | null;
  source?: string;
  sourceUrl?: string | null;
  notes?: string | null;
  status?: UpcomingTournamentStatus;
};

export type UpcomingTournamentFeedRow = {
  recruitPersonId: string;
  recruitName: string;
  recruitPriorityLabel: string | null;
  lastContactDateLabel: string | null;
  daysSinceLastContact: number | null;
  daysUntilStart: number;
  startDateLabel: string;
  tournament: RecruitUpcomingTournament;
};

export type LatestResultOpponentContext = {
  opponentName: string;
  opponentTrnRank: string | null;
  opponentGradYear: number | null;
  opponentUtr: string | null;
  recruitUtr: string | null;
  matchDateLabel: string;
};

export type LatestResultEntry = {
  result: RecruitMatchResult;
  opponent: LatestResultOpponentContext;
};

export type LatestResultRow = {
  recruitPersonId: string;
  recruitName: string;
  latestResult: LatestResultEntry | null;
  recentResults: LatestResultEntry[];
};

export type TodayBetaActivitySummary = {
  recruitsMonitored: number;
  checkedTodayCount: number;
  newResultsCount: number;
  matchesStored: number;
  baselinesEstablished: number;
  lastMonitoringActivityAt: string | null;
  lastImportAt: string | null;
  recruitsWithActivityLast14Days: number;
  utrConfiguredCount: number;
  missingUtrCount: number;
  utrAgentLastBatch?: UtrAgentBatchRunSummary;
};

import type { ContactOpportunity } from "./contactOpportunityScore";

export type TodayBetaPageData = {
  activitySummary: TodayBetaActivitySummary;
  players: TodayBetaPlayerRow[];
  contactOpportunities: ContactOpportunity[];
  upcomingTournaments: UpcomingTournamentFeedRow[];
  latestResults: LatestResultRow[];
  newResults: Array<
    RecruitMatchResult & {
      recruitName: string;
      firstDetectedAtLabel: string;
      tournamentDateLabel: string;
    }
  >;
};
