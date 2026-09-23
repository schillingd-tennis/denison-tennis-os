import type { DirectReportSource, Handedness } from "./csvImport";

export type ScoutingView =
  | "opponentPlayers"
  | "teams"
  | "matchReports"
  | "formSubmissions";

export type ImportStatus =
  | "imported"
  | "unresolved_review"
  | "compound_unresolved"
  | "team_level";

export type ReportKind = "manual" | "ai_generated";
export type ReportReviewStatus = "draft" | "reviewed";

export type FormSubmissionStatus =
  | "new"
  | "needs_review"
  | "published"
  | "archived"
  | "rejected"
  /** @deprecated Prefer published after real promotion. */
  | "reviewed"
  /** @deprecated Prefer needs_review. */
  | "needs_clarification";

export type ScoutingTeam = {
  id: string;
  displayName: string;
  identitySlug: string | null;
  /** Active (non-archived) opponent players only. */
  playerCount: number;
  /** Archived opponents for this team (secondary disclosure). */
  archivedPlayerCount: number;
  reportCount: number;
};

export type ScoutingOpponentPlayer = {
  id: string;
  teamId: string;
  teamDisplayName: string;
  displayName: string;
  normalizedName: string;
  handedness: Handedness | null;
  directReportCount: number;
  hasAiReport: boolean;
  aiStale: boolean;
  /** Null = active; set when archived (additive lifecycle, not deletion). */
  archivedAt: string | null;
  archivedBy: string | null;
};

export type OpponentPlayerLifecycleView = "active" | "archived";

export type ScoutingDirectReport = {
  id: string;
  sourceKey: string;
  source: DirectReportSource;
  teamId: string;
  teamDisplayName: string;
  opponentPlayerId: string | null;
  opponentDisplayName: string;
  matchDate: string | null;
  matchDateRaw: string;
  handedness: Handedness | null;
  handednessRaw: string;
  strengthsWeaknesses: string;
  scoutingReport: string;
  reportBy: string;
  /** Canonical author identity when known; preferred over reportBy for contributor counts. */
  reportAuthorUserId: string | null;
  isDoubles: boolean;
  importStatus: ImportStatus;
  attachmentRefs: string[];
  /** Set when this report was promoted from a form submission. */
  formSubmissionId: string | null;
};

export type ScoutingPlayerReport = {
  id: string;
  opponentPlayerId: string;
  kind: ReportKind;
  body: string;
  /** Short Overview bullets from the same AI generation as `body`. */
  quickSummaryBullets: string[];
  status: ReportReviewStatus;
  citedDirectReportIds: string[];
  stale: boolean;
  generatedAt: string | null;
  reviewedAt: string | null;
};

export type ScoutingTeamReport = {
  id: string;
  teamId: string;
  kind: ReportKind;
  body: string;
  status: ReportReviewStatus;
  citedDirectReportIds: string[];
  citedPlayerReportIds: string[];
  attachmentRefs: string[];
  stale: boolean;
  generatedAt: string | null;
  reviewedAt: string | null;
};

export type ScoutingFormLink = {
  id: string;
  label: string;
  teamId: string | null;
  opponentPlayerId: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /** Present only immediately after create — never stored. */
  rawToken?: string;
};

export type ScoutingFormSubmission = {
  id: string;
  formLinkId: string;
  status: FormSubmissionStatus;
  opponentDisplayName: string;
  teamDisplayName: string;
  matchDate: string | null;
  handedness: Handedness | null;
  strengthsWeaknesses: string;
  scoutingReport: string;
  reportBy: string;
  isDoubles: boolean;
  createdAt: string;
  reviewedAt: string | null;
  resolvedTeamId: string | null;
  resolvedOpponentPlayerId: string | null;
  promotedDirectReportId: string | null;
  /** Resolved canonical team display when known (list join). */
  resolvedTeamDisplayName?: string | null;
  resolvedOpponentDisplayName?: string | null;
};

/** Match Reports row that may be a direct report or an unresolved submission. */
export type MatchReportsListItem =
  | { kind: "direct_report"; report: ScoutingDirectReport }
  | { kind: "needs_review_submission"; submission: ScoutingFormSubmission };
export type ScoutingSortDirection = "asc" | "desc";

export type PlayerSortKey =
  | "displayName"
  | "teamDisplayName"
  | "handedness"
  | "directReportCount";

export type TeamSortKey = "displayName" | "playerCount" | "reportCount";

export type MatchReportSortKey =
  | "matchDate"
  | "opponentDisplayName"
  | "teamDisplayName"
  | "reportBy"
  | "importStatus";

export type SubmissionSortKey = "createdAt" | "status" | "opponentDisplayName" | "teamDisplayName";

export type ScoutingFilters = {
  query: string;
  teamId: string;
  handedness: string;
  /** UI-only AI report status filter for Opponent Players. */
  aiStatus: string;
  importStatus: string;
  submissionStatus: string;
};
