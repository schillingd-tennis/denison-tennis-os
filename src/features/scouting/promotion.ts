/**
 * Pure submission → Scouting promotion matching (no DB I/O).
 * Mirrors 0068 SQL priority; used by unit tests and review UI helpers.
 */
import { createHash } from "node:crypto";

import {
  isCompoundOpponentName,
  isTeamLevelOpponent,
  normalizePlayerKey,
  safeCapsPersonName,
} from "./csvImport";

export type FormSubmissionStatusLifecycle =
  | "new"
  | "needs_review"
  | "published"
  | "archived"
  | "rejected"
  | "reviewed"
  | "needs_clarification";

export type PromotionOutcome =
  | "published_player_link"
  | "published_team_link_player_match"
  | "published_alias_player_match"
  | "needs_review_new_player"
  | "needs_review_ambiguous_player"
  | "needs_review_unknown_team"
  | "needs_review_broken_player_link"
  | "skipped_archived"
  | "skipped_rejected"
  | "already_promoted";

export type PromotionCatalogTeam = {
  id: string;
  displayName: string;
  identitySlug: string | null;
};

export type PromotionCatalogPlayer = {
  id: string;
  teamId: string;
  displayName: string;
  normalizedName: string;
  archivedAt?: string | null;
};

export type PromotionCatalogAlias = {
  teamId: string;
  normalizedAlias: string;
  displayAlias: string;
};

export type PromotionFormLink = {
  id: string;
  teamId: string | null;
  opponentPlayerId: string | null;
};

export type PromotionSubmission = {
  id: string;
  formLinkId: string;
  status: FormSubmissionStatusLifecycle;
  opponentDisplayName: string;
  teamDisplayName: string;
  /** When already linked to a direct report. */
  promotedDirectReportId?: string | null;
};

export type PromotionDecision = {
  outcome: PromotionOutcome;
  submissionStatus: FormSubmissionStatusLifecycle;
  teamId: string | null;
  opponentPlayerId: string | null;
  /** Create a new player under teamId when promoting (clean name only). */
  createPlayer: boolean;
  playerDisplayName: string | null;
  importStatus: "imported" | "unresolved_review" | "compound_unresolved" | "team_level";
  /** True when a direct report row should be written (requires teamId). */
  shouldCreateDirectReport: boolean;
  sourceKey: string;
};

/** Exact normalized alias key: lowercase, trim, collapse whitespace. */
export function normalizeSchoolAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function playerFormSourceKey(submissionId: string): string {
  return createHash("md5").update(`player_form:${submissionId}`).digest("hex");
}

export function isCleanSinglePlayerName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (isTeamLevelOpponent(trimmed)) return false;
  if (isCompoundOpponentName(trimmed)) return false;
  return true;
}

export function resolveTeamIdByAlias(
  teamLabel: string,
  aliases: PromotionCatalogAlias[],
  teams: PromotionCatalogTeam[],
): string | null {
  const norm = normalizeSchoolAlias(teamLabel);
  if (!norm) return null;

  const aliasHit = aliases.find((row) => row.normalizedAlias === norm);
  if (aliasHit) return aliasHit.teamId;

  const exactDisplay = teams.find((row) => normalizeSchoolAlias(row.displayName) === norm);
  if (exactDisplay) return exactDisplay.id;

  return null;
}

function findPlayerOnTeam(
  teamId: string,
  opponentName: string,
  players: PromotionCatalogPlayer[],
): PromotionCatalogPlayer | null {
  const norm = normalizePlayerKey(opponentName);
  if (!norm) return null;
  return (
    players.find(
      (row) =>
        row.teamId === teamId &&
        row.normalizedName === norm &&
        row.archivedAt == null,
    ) ?? null
  );
}

/**
 * Matching priority:
 * 1. Player-specific form link
 * 2. Team-specific form link + exact player within that team
 * 3. Canonical alias + exact player within that team
 * 4. Canonical team known, clean new player → needs_review
 * 5. Unknown/ambiguous → needs_review, no invented team
 */
export function resolveSubmissionPromotion(input: {
  submission: PromotionSubmission;
  link: PromotionFormLink | null;
  teams: PromotionCatalogTeam[];
  players: PromotionCatalogPlayer[];
  aliases: PromotionCatalogAlias[];
}): PromotionDecision {
  const { submission, link, teams, players, aliases } = input;
  const sourceKey = playerFormSourceKey(submission.id);
  const opponentRaw = submission.opponentDisplayName;
  const playerDisplay = opponentRaw.trim()
    ? safeCapsPersonName(opponentRaw) || opponentRaw.trim()
    : null;

  if (submission.status === "archived") {
    return {
      outcome: "skipped_archived",
      submissionStatus: "archived",
      teamId: null,
      opponentPlayerId: null,
      createPlayer: false,
      playerDisplayName: playerDisplay,
      importStatus: "unresolved_review",
      shouldCreateDirectReport: false,
      sourceKey,
    };
  }
  if (submission.status === "rejected") {
    return {
      outcome: "skipped_rejected",
      submissionStatus: "rejected",
      teamId: null,
      opponentPlayerId: null,
      createPlayer: false,
      playerDisplayName: playerDisplay,
      importStatus: "unresolved_review",
      shouldCreateDirectReport: false,
      sourceKey,
    };
  }
  if (submission.promotedDirectReportId) {
    return {
      outcome: "already_promoted",
      submissionStatus: submission.status === "new" ? "needs_review" : submission.status,
      teamId: null,
      opponentPlayerId: null,
      createPlayer: false,
      playerDisplayName: playerDisplay,
      importStatus: "imported",
      shouldCreateDirectReport: false,
      sourceKey,
    };
  }

  // 1) Player-scoped link — submitted text must not override.
  if (link?.opponentPlayerId) {
    const linked = players.find((row) => row.id === link.opponentPlayerId) ?? null;
    if (!linked) {
      return {
        outcome: "needs_review_broken_player_link",
        submissionStatus: "needs_review",
        teamId: null,
        opponentPlayerId: null,
        createPlayer: false,
        playerDisplayName: playerDisplay,
        importStatus: "unresolved_review",
        shouldCreateDirectReport: false,
        sourceKey,
      };
    }
    return {
      outcome: "published_player_link",
      submissionStatus: "published",
      teamId: linked.teamId,
      opponentPlayerId: linked.id,
      createPlayer: false,
      playerDisplayName: linked.displayName,
      importStatus: "imported",
      shouldCreateDirectReport: true,
      sourceKey,
    };
  }

  // 2) Team-scoped link
  if (link?.teamId) {
    const teamId = link.teamId;
    if (!teams.some((row) => row.id === teamId)) {
      return {
        outcome: "needs_review_unknown_team",
        submissionStatus: "needs_review",
        teamId: null,
        opponentPlayerId: null,
        createPlayer: false,
        playerDisplayName: playerDisplay,
        importStatus: "unresolved_review",
        shouldCreateDirectReport: false,
        sourceKey,
      };
    }
    if (!isCleanSinglePlayerName(opponentRaw)) {
      return {
        outcome: "needs_review_ambiguous_player",
        submissionStatus: "needs_review",
        teamId,
        opponentPlayerId: null,
        createPlayer: false,
        playerDisplayName: playerDisplay,
        importStatus: isTeamLevelOpponent(opponentRaw) ? "team_level" : "compound_unresolved",
        shouldCreateDirectReport: true,
        sourceKey,
      };
    }
    const existing = findPlayerOnTeam(teamId, opponentRaw, players);
    if (existing) {
      return {
        outcome: "published_team_link_player_match",
        submissionStatus: "published",
        teamId,
        opponentPlayerId: existing.id,
        createPlayer: false,
        playerDisplayName: existing.displayName,
        importStatus: "imported",
        shouldCreateDirectReport: true,
        sourceKey,
      };
    }
    return {
      outcome: "needs_review_new_player",
      submissionStatus: "needs_review",
      teamId,
      opponentPlayerId: null,
      createPlayer: true,
      playerDisplayName: playerDisplay,
      importStatus: "unresolved_review",
      shouldCreateDirectReport: true,
      sourceKey,
    };
  }

  // 3–5) Alias / unknown
  const teamId = resolveTeamIdByAlias(submission.teamDisplayName, aliases, teams);
  if (!teamId) {
    return {
      outcome: "needs_review_unknown_team",
      submissionStatus: "needs_review",
      teamId: null,
      opponentPlayerId: null,
      createPlayer: false,
      playerDisplayName: playerDisplay,
      importStatus: "unresolved_review",
      shouldCreateDirectReport: false,
      sourceKey,
    };
  }

  if (!isCleanSinglePlayerName(opponentRaw)) {
    return {
      outcome: "needs_review_ambiguous_player",
      submissionStatus: "needs_review",
      teamId,
      opponentPlayerId: null,
      createPlayer: false,
      playerDisplayName: playerDisplay,
      importStatus: isTeamLevelOpponent(opponentRaw) ? "team_level" : "compound_unresolved",
      shouldCreateDirectReport: true,
      sourceKey,
    };
  }

  const existing = findPlayerOnTeam(teamId, opponentRaw, players);
  if (existing) {
    return {
      outcome: "published_alias_player_match",
      submissionStatus: "published",
      teamId,
      opponentPlayerId: existing.id,
      createPlayer: false,
      playerDisplayName: existing.displayName,
      importStatus: "imported",
      shouldCreateDirectReport: true,
      sourceKey,
    };
  }

  return {
    outcome: "needs_review_new_player",
    submissionStatus: "needs_review",
    teamId,
    opponentPlayerId: null,
    createPlayer: true,
    playerDisplayName: playerDisplay,
    importStatus: "unresolved_review",
    shouldCreateDirectReport: true,
    sourceKey,
  };
}

/** Match Reports hybrid: unresolved submissions that are not yet promoted. */
export function isUnresolvedSubmissionForMatchReports(submission: {
  status: string;
  promotedDirectReportId?: string | null;
}): boolean {
  if (submission.promotedDirectReportId) return false;
  return (
    submission.status === "new" ||
    submission.status === "needs_review" ||
    submission.status === "needs_clarification"
  );
}

export function submissionStatusLabel(status: string): string {
  switch (status) {
    case "new":
      return "New";
    case "needs_review":
    case "needs_clarification":
      return "Needs Review";
    case "published":
    case "reviewed":
      return "Published";
    case "archived":
      return "Archived";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}
