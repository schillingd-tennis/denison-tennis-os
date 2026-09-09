import type { Handedness } from "./csvImport";
import type {
  FormSubmissionStatus,
  ImportStatus,
  ReportKind,
  ReportReviewStatus,
  ScoutingDirectReport,
  ScoutingFormLink,
  ScoutingFormSubmission,
  ScoutingOpponentPlayer,
  ScoutingPlayerReport,
  ScoutingTeam,
  ScoutingTeamReport,
} from "./types";
import type { DirectReportSource } from "./csvImport";

export type TeamRow = {
  id: string;
  display_name: string;
  identity_slug: string | null;
};

export type PlayerRow = {
  id: string;
  team_id: string;
  display_name: string;
  normalized_name: string;
  handedness: string | null;
  archived_at?: string | null;
  archived_by?: string | null;
  scouting_teams?: { display_name: string } | null;
};

export type DirectReportRow = {
  id: string;
  source_key: string;
  source: string;
  team_id: string;
  opponent_player_id: string | null;
  opponent_display_name: string | null;
  match_date: string | null;
  match_date_raw: string | null;
  handedness: string | null;
  handedness_raw: string | null;
  strengths_weaknesses: string | null;
  scouting_report: string | null;
  report_by: string | null;
  report_author_user_id?: string | null;
  is_doubles: boolean;
  import_status: string;
  attachment_refs: unknown;
  scouting_teams?: { display_name: string } | null;
};

export type PlayerReportRow = {
  id: string;
  opponent_player_id: string;
  kind: string;
  body: string | null;
  quick_summary_bullets?: string[] | null;
  status: string;
  cited_direct_report_ids: string[] | null;
  stale: boolean;
  generated_at: string | null;
  reviewed_at: string | null;
};

export type TeamReportRow = {
  id: string;
  team_id: string;
  kind: string;
  body: string | null;
  status: string;
  cited_direct_report_ids: string[] | null;
  cited_player_report_ids: string[] | null;
  attachment_refs: unknown;
  stale: boolean;
  generated_at: string | null;
  reviewed_at: string | null;
};

export type FormLinkRow = {
  id: string;
  label: string | null;
  team_id: string | null;
  opponent_player_id: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type FormSubmissionRow = {
  id: string;
  form_link_id: string;
  status: string;
  opponent_display_name: string | null;
  team_display_name: string | null;
  match_date: string | null;
  handedness: string | null;
  strengths_weaknesses: string | null;
  scouting_report: string | null;
  report_by: string | null;
  is_doubles: boolean;
  created_at: string;
  reviewed_at: string | null;
};

function attachmentRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function mapTeam(
  row: TeamRow,
  counts?: { playerCount?: number; archivedPlayerCount?: number; reportCount?: number },
): ScoutingTeam {
  return {
    id: row.id,
    displayName: row.display_name,
    identitySlug: row.identity_slug,
    playerCount: counts?.playerCount ?? 0,
    archivedPlayerCount: counts?.archivedPlayerCount ?? 0,
    reportCount: counts?.reportCount ?? 0,
  };
}

export function mapPlayer(
  row: PlayerRow,
  extras?: { directReportCount?: number; hasAiReport?: boolean; aiStale?: boolean },
): ScoutingOpponentPlayer {
  return {
    id: row.id,
    teamId: row.team_id,
    teamDisplayName: row.scouting_teams?.display_name ?? "",
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    handedness: (row.handedness as Handedness | null) ?? null,
    directReportCount: extras?.directReportCount ?? 0,
    hasAiReport: extras?.hasAiReport ?? false,
    aiStale: extras?.aiStale ?? false,
    archivedAt: row.archived_at ?? null,
    archivedBy: row.archived_by ?? null,
  };
}

export function mapDirectReport(row: DirectReportRow): ScoutingDirectReport {
  return {
    id: row.id,
    sourceKey: row.source_key,
    source: row.source as DirectReportSource,
    teamId: row.team_id,
    teamDisplayName: row.scouting_teams?.display_name ?? "",
    opponentPlayerId: row.opponent_player_id,
    opponentDisplayName: row.opponent_display_name ?? "",
    matchDate: row.match_date,
    matchDateRaw: row.match_date_raw ?? "",
    handedness: (row.handedness as Handedness | null) ?? null,
    handednessRaw: row.handedness_raw ?? "",
    strengthsWeaknesses: row.strengths_weaknesses ?? "",
    scoutingReport: row.scouting_report ?? "",
    reportBy: row.report_by ?? "",
    reportAuthorUserId: row.report_author_user_id ?? null,
    isDoubles: Boolean(row.is_doubles),
    importStatus: row.import_status as ImportStatus,
    attachmentRefs: attachmentRefs(row.attachment_refs),
  };
}

export function mapPlayerReport(row: PlayerReportRow): ScoutingPlayerReport {
  return {
    id: row.id,
    opponentPlayerId: row.opponent_player_id,
    kind: row.kind as ReportKind,
    body: row.body ?? "",
    quickSummaryBullets: Array.isArray(row.quick_summary_bullets)
      ? row.quick_summary_bullets.filter((item): item is string => typeof item === "string")
      : [],
    status: row.status as ReportReviewStatus,
    citedDirectReportIds: row.cited_direct_report_ids ?? [],
    stale: Boolean(row.stale),
    generatedAt: row.generated_at,
    reviewedAt: row.reviewed_at,
  };
}

export function mapTeamReport(row: TeamReportRow): ScoutingTeamReport {
  return {
    id: row.id,
    teamId: row.team_id,
    kind: row.kind as ReportKind,
    body: row.body ?? "",
    status: row.status as ReportReviewStatus,
    citedDirectReportIds: row.cited_direct_report_ids ?? [],
    citedPlayerReportIds: row.cited_player_report_ids ?? [],
    attachmentRefs: attachmentRefs(row.attachment_refs),
    stale: Boolean(row.stale),
    generatedAt: row.generated_at,
    reviewedAt: row.reviewed_at,
  };
}

export function mapFormLink(row: FormLinkRow, rawToken?: string): ScoutingFormLink {
  return {
    id: row.id,
    label: row.label ?? "",
    teamId: row.team_id,
    opponentPlayerId: row.opponent_player_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    rawToken,
  };
}

export function mapFormSubmission(row: FormSubmissionRow): ScoutingFormSubmission {
  return {
    id: row.id,
    formLinkId: row.form_link_id,
    status: row.status as FormSubmissionStatus,
    opponentDisplayName: row.opponent_display_name ?? "",
    teamDisplayName: row.team_display_name ?? "",
    matchDate: row.match_date,
    handedness: (row.handedness as Handedness | null) ?? null,
    strengthsWeaknesses: row.strengths_weaknesses ?? "",
    scoutingReport: row.scouting_report ?? "",
    reportBy: row.report_by ?? "",
    isDoubles: Boolean(row.is_doubles),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}
