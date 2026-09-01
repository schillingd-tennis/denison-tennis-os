/**
 * Rule-based suggested recruiting text for Contact Today (Today Beta v0.1).
 */
import {
  LATE_ROUND_TOKENS,
  SUGGESTED_TEXT_TEMPLATES,
  TOURNAMENT_RUN_MIN_NEW_WINS,
} from "./suggestedTextConfig";
import { UPCOMING_TOURNAMENT_SUGGESTED_TEXT_MAX_DAYS } from "./upcomingTournamentConfig";
import type { MatchResultOutcome, RecruitMatchResult } from "./types";

export type SuggestedTextCategory =
  | "strong_win"
  | "good_win"
  | "routine_win"
  | "strong_tournament_run"
  | "tough_loss_strong_opponent"
  | "cadence_general"
  | "cadence_no_contact"
  | "upcoming_tournament_imminent"
  | "upcoming_tournament_soon";

export type SuggestedTextInput = {
  recruitFirstName?: string;
  matchResult: RecruitMatchResult;
  /** All NEW results for this recruit (for tournament-run detection). */
  newMatchResults?: readonly RecruitMatchResult[];
};

export type SuggestedTextResult = {
  category: SuggestedTextCategory | null;
  text: string | null;
};

function parseOpponentRank(value: string | undefined): number | null {
  if (!value || value.trim().toUpperCase() === "UNKNOWN") return null;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const rank = Number.parseInt(digits, 10);
  return Number.isFinite(rank) && rank > 0 ? rank : null;
}

function formatNameSuffix(firstName: string | undefined): string {
  const trimmed = firstName?.trim();
  return trimmed ? ` ${trimmed}` : "";
}

function applyTemplate(template: string, firstName: string | undefined): string {
  return template.replace("{name}", formatNameSuffix(firstName));
}

function normalizeTournamentName(value: string | undefined): string | null {
  if (!value || value.trim().toUpperCase() === "UNKNOWN") return null;
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeRoundToken(round: string | undefined): string | null {
  if (!round || round.trim().toUpperCase() === "UNKNOWN") return null;
  return round.trim().toUpperCase().replace(/\s+/g, "");
}

export function isLateRound(round: string | undefined): boolean {
  const token = normalizeRoundToken(round);
  if (!token) return false;
  if (LATE_ROUND_TOKENS.has(token)) return true;
  return /^(SF|F)$/.test(token);
}

export function countNewWinsInSameTournament(
  matchResult: RecruitMatchResult,
  newMatchResults: readonly RecruitMatchResult[],
): number {
  const tournament = normalizeTournamentName(matchResult.tournamentName);
  if (!tournament) return 0;

  return newMatchResults.filter(
    (result) =>
      result.result === "WIN" &&
      normalizeTournamentName(result.tournamentName) === tournament,
  ).length;
}

export function isStrongTournamentRun(input: SuggestedTextInput): boolean {
  const newResults = input.newMatchResults ?? [input.matchResult];
  const sameTournamentWins = countNewWinsInSameTournament(input.matchResult, newResults);

  return (
    input.matchResult.result === "WIN" &&
    (isLateRound(input.matchResult.round) ||
      sameTournamentWins >= TOURNAMENT_RUN_MIN_NEW_WINS)
  );
}

export function selectSuggestedTextCategory(input: SuggestedTextInput): SuggestedTextCategory | null {
  const { matchResult } = input;
  const rank = parseOpponentRank(matchResult.opponentRanking);
  const result: MatchResultOutcome = matchResult.result;

  if (result === "LOSS") {
    if (rank != null && rank <= 100) {
      return "tough_loss_strong_opponent";
    }
    return null;
  }

  if (result !== "WIN") {
    return null;
  }

  if (isStrongTournamentRun(input)) {
    return "strong_tournament_run";
  }

  if (rank != null && rank <= 100) {
    return "strong_win";
  }

  if (rank != null && rank <= 200) {
    return "good_win";
  }

  return "routine_win";
}

export function buildSuggestedText(input: SuggestedTextInput): SuggestedTextResult {
  if (!input.matchResult) {
    return { category: null, text: null };
  }

  const category = selectSuggestedTextCategory(input);
  if (!category) {
    return { category: null, text: null };
  }

  const template = SUGGESTED_TEXT_TEMPLATES[category];
  return {
    category,
    text: applyTemplate(template, input.recruitFirstName),
  };
}

export function buildCadenceSuggestedText(input: {
  recruitFirstName?: string;
  daysSinceLastContact: number | null;
}): SuggestedTextResult {
  const category: SuggestedTextCategory =
    input.daysSinceLastContact == null ? "cadence_no_contact" : "cadence_general";
  const template = SUGGESTED_TEXT_TEMPLATES[category];
  return {
    category,
    text: applyTemplate(template, input.recruitFirstName),
  };
}

export function buildUpcomingTournamentSuggestedText(input: {
  recruitFirstName?: string;
  daysUntilTournamentStart: number | null;
}): SuggestedTextResult {
  if (
    input.daysUntilTournamentStart == null ||
    input.daysUntilTournamentStart < 0 ||
    input.daysUntilTournamentStart > UPCOMING_TOURNAMENT_SUGGESTED_TEXT_MAX_DAYS
  ) {
    return { category: null, text: null };
  }

  const category: SuggestedTextCategory =
    input.daysUntilTournamentStart <= 1
      ? "upcoming_tournament_imminent"
      : "upcoming_tournament_soon";
  const template = SUGGESTED_TEXT_TEMPLATES[category];
  return {
    category,
    text: applyTemplate(template, input.recruitFirstName),
  };
}

export function buildContactSuggestedText(input: {
  recruitFirstName?: string;
  matchResult?: RecruitMatchResult;
  newMatchResults?: readonly RecruitMatchResult[];
  hasCadence: boolean;
  daysSinceLastContact: number | null;
  hasTournament?: boolean;
  daysUntilTournamentStart?: number | null;
}): SuggestedTextResult {
  if (input.matchResult) {
    const resultSuggested = buildSuggestedText({
      recruitFirstName: input.recruitFirstName,
      matchResult: input.matchResult,
      newMatchResults: input.newMatchResults,
    });
    if (resultSuggested.text) {
      return resultSuggested;
    }
  }

  if (input.hasTournament) {
    const tournamentSuggested = buildUpcomingTournamentSuggestedText({
      recruitFirstName: input.recruitFirstName,
      daysUntilTournamentStart: input.daysUntilTournamentStart ?? null,
    });
    if (tournamentSuggested.text) {
      return tournamentSuggested;
    }
  }

  if (input.hasCadence) {
    return buildCadenceSuggestedText({
      recruitFirstName: input.recruitFirstName,
      daysSinceLastContact: input.daysSinceLastContact,
    });
  }

  return { category: null, text: null };
}

/** Extract a usable first name from directory display name or person fields. */
export function recruitFirstNameFromDisplay(
  displayName: string,
  preferredOrFirstName?: string,
): string {
  const fromPerson = preferredOrFirstName?.trim();
  if (fromPerson) return fromPerson.split(/\s+/)[0] ?? fromPerson;

  const fromDisplay = displayName.trim().split(/\s+/)[0];
  return fromDisplay ?? "";
}
