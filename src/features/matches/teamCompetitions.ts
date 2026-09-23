/**
 * Events tab: Schedule-derived competitions joined to Matches results.
 * Does not create match_events — list comes from Schedule; Matches is optional join.
 */

import { displayOpponentOrEvent, type TeamScheduleEvent } from "@/features/teamSchedule/types";
import {
  matchesEventPath,
  matchesImportPath,
  teamOperationsScheduleEventPath,
} from "@/lib/module-routes";

import type { MatchEvent, MatchEventType, MatchResult } from "./types";
import {
  isCompetitiveScheduleEvent,
  matchEventTypeFromSchedule,
  scheduleResultsFormat,
} from "./scheduleLink";

export { isCompetitiveScheduleEvent };

/** App timezone used for Upcoming vs Needs Results (matches Practice / Interactions). */
export const MATCHES_APP_TIME_ZONE = "America/New_York";

export const RESULTS_STATUS_KEYS = [
  "upcoming",
  "awaiting",
  "partial",
  "complete",
] as const;
export type ResultsStatusKey = (typeof RESULTS_STATUS_KEYS)[number];

export const RESULTS_STATUS_LABELS: Record<ResultsStatusKey, string> = {
  upcoming: "Upcoming",
  awaiting: "Awaiting results",
  partial: "Partial results",
  complete: "Complete",
};

export const COMPETITION_FILTERS = [
  "all",
  "needs_results",
  "upcoming",
  "complete",
] as const;
export type CompetitionFilter = (typeof COMPETITION_FILTERS)[number];

export type ResultsActionKind = "enter" | "continue" | "view" | "blocked";

export type TeamCompetitionRow = {
  /** Schedule event id — primary key for Team tab rows. */
  scheduleEventId: string;
  schedule: TeamScheduleEvent;
  matchEvent: MatchEvent | null;
  resultCount: number;
  /** Dual / tournament when unambiguous; null for incomplete placeholders. */
  matchFormat: MatchEventType | null;
  formatAmbiguous: boolean;
  formatBlockedReason: string | null;
  resultsStatus: ResultsStatusKey;
  needsResults: boolean;
  action: ResultsActionKind;
  actionLabel: string;
  incompletePlaceholder: boolean;
};

/** Exclude non_team_event (alumni / travel-only / noncompetitive logistics). */
export function isNoncompetitiveScheduleEvent(event: TeamScheduleEvent): boolean {
  return event.eventType === "non_team_event";
}

export function todayIsoInAppTimeZone(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MATCHES_APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/** Event has started or is underway when start_date <= today (app TZ). */
export function scheduleHasStarted(
  schedule: TeamScheduleEvent,
  todayIso: string = todayIsoInAppTimeZone(),
): boolean {
  return schedule.startDate <= todayIso;
}

export function scheduleIsUpcoming(
  schedule: TeamScheduleEvent,
  todayIso: string = todayIsoInAppTimeZone(),
): boolean {
  return schedule.startDate > todayIso;
}

/**
 * Any persisted results entry work — not “complete”.
 * Team score alone does not imply complete; it does imply Partial.
 */
export function hasResultsEntryWork(
  matchEvent: MatchEvent | null | undefined,
  resultCount: number,
): boolean {
  if (!matchEvent) return false;
  if (resultCount > 0) return true;
  if (matchEvent.reportedTeamScoreDenison != null || matchEvent.reportedTeamScoreOpponent != null) {
    return true;
  }
  if (matchEvent.calculatedTeamScoreDenison != null || matchEvent.calculatedTeamScoreOpponent != null) {
    return true;
  }
  if (matchEvent.teamOutcome != null) return true;
  return false;
}

/**
 * Derive Results status. Explicit mark-complete only → Complete.
 * Never infer Complete from team score, event.status, or a single result.
 */
export function deriveResultsStatus(input: {
  schedule: TeamScheduleEvent;
  matchEvent: MatchEvent | null;
  resultCount: number;
  todayIso?: string;
}): ResultsStatusKey {
  const today = input.todayIso ?? todayIsoInAppTimeZone();
  const { schedule, matchEvent, resultCount } = input;

  if (matchEvent?.resultsMarkedCompleteAt) {
    return "complete";
  }

  if (hasResultsEntryWork(matchEvent, resultCount)) {
    return "partial";
  }

  if (scheduleIsUpcoming(schedule, today)) {
    return "upcoming";
  }

  return "awaiting";
}

export function resultsActionFor(status: ResultsStatusKey, formatBlocked: boolean): {
  action: ResultsActionKind;
  label: string;
} {
  if (formatBlocked) {
    return { action: "blocked", label: "Fix Schedule type" };
  }
  if (status === "complete") {
    return { action: "view", label: "View Results" };
  }
  if (status === "partial") {
    return { action: "continue", label: "Continue Entry" };
  }
  return { action: "enter", label: "Enter Results" };
}

export function needsResultsForRow(input: {
  schedule: TeamScheduleEvent;
  resultsStatus: ResultsStatusKey;
}): boolean {
  if (input.schedule.status === "cancelled") return false;
  return input.resultsStatus === "awaiting" || input.resultsStatus === "partial";
}

export function buildTeamCompetitionRows(input: {
  scheduleEvents: readonly TeamScheduleEvent[];
  matchEvents: readonly MatchEvent[];
  results: readonly MatchResult[];
  todayIso?: string;
}): TeamCompetitionRow[] {
  const today = input.todayIso ?? todayIsoInAppTimeZone();
  const matchBySchedule = new Map<string, MatchEvent>();
  for (const event of input.matchEvents) {
    if (event.scheduleEventId) {
      matchBySchedule.set(event.scheduleEventId, event);
    }
  }

  const resultCountByEvent = new Map<string, number>();
  for (const result of input.results) {
    resultCountByEvent.set(result.eventId, (resultCountByEvent.get(result.eventId) ?? 0) + 1);
  }

  const rows: TeamCompetitionRow[] = [];
  for (const schedule of input.scheduleEvents) {
    if (!isCompetitiveScheduleEvent(schedule)) continue;

    const matchEvent = matchBySchedule.get(schedule.id) ?? null;
    const resultCount = matchEvent ? (resultCountByEvent.get(matchEvent.id) ?? 0) : 0;
    const format = scheduleResultsFormat(schedule);
    const matchFormat = format.ambiguous ? null : format.status;
    const formatAmbiguous = format.ambiguous;
    const formatBlockedReason = format.ambiguous ? format.reason : null;
    const incompletePlaceholder = schedule.eventType === "team_match_placeholder";

    const resultsStatus = deriveResultsStatus({
      schedule,
      matchEvent,
      resultCount,
      todayIso: today,
    });
    const { action, label } = resultsActionFor(resultsStatus, formatAmbiguous);
    const needsResults = needsResultsForRow({ schedule, resultsStatus });

    rows.push({
      scheduleEventId: schedule.id,
      schedule,
      matchEvent,
      resultCount,
      matchFormat: matchFormat ?? matchEvent?.eventType ?? null,
      formatAmbiguous,
      formatBlockedReason,
      resultsStatus,
      needsResults,
      action,
      actionLabel: label,
      incompletePlaceholder,
    });
  }

  return rows.sort((a, b) => {
    const dateCmp = a.schedule.startDate.localeCompare(b.schedule.startDate);
    if (dateCmp !== 0) return dateCmp;
    return a.schedule.sortOrder - b.schedule.sortOrder;
  });
}

export function filterTeamCompetitionRows(
  rows: readonly TeamCompetitionRow[],
  options: {
    seasonYear: number | "all";
    eventType: "all" | "dual" | "tournament";
    competitionFilter: CompetitionFilter;
    query: string;
  },
): TeamCompetitionRow[] {
  const q = options.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (options.seasonYear !== "all" && row.schedule.seasonYear !== options.seasonYear) {
      return false;
    }

    if (options.eventType !== "all") {
      const format = row.matchFormat ?? matchEventTypeFromSchedule(row.schedule);
      if (format !== options.eventType) return false;
    }

    if (options.competitionFilter === "needs_results" && !row.needsResults) return false;
    if (options.competitionFilter === "upcoming" && row.resultsStatus !== "upcoming") return false;
    if (options.competitionFilter === "complete" && row.resultsStatus !== "complete") return false;

    if (!q) return true;
    const hay = [
      displayOpponentOrEvent(row.schedule),
      row.schedule.opponentName,
      row.schedule.eventName,
      row.schedule.venueName,
      row.schedule.locationText,
      row.schedule.city,
      row.schedule.state,
      row.schedule.eventType,
      row.schedule.status,
      row.resultsStatus,
      row.matchFormat,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

/** Unlinked Matches containers — never hide; do not invent Schedule rows for them. */
export function listUnlinkedMatchEvents(matchEvents: readonly MatchEvent[]): MatchEvent[] {
  return matchEvents
    .filter((event) => !event.scheduleEventId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function competitionHref(row: TeamCompetitionRow): string {
  if (row.action === "blocked") {
    return teamOperationsScheduleEventPath(row.scheduleEventId);
  }
  if (row.action === "view" && row.matchEvent) {
    return matchesEventPath(row.matchEvent.id);
  }
  if (row.matchEvent && row.resultsStatus === "complete") {
    return matchesEventPath(row.matchEvent.id);
  }
  // Enter / Continue — shared import/entry flow with Schedule preselected
  return matchesImportPath(row.scheduleEventId);
}

/** Row click: view existing container when present; otherwise shared entry. */
export function competitionRowHref(row: TeamCompetitionRow): string {
  if (row.matchEvent) {
    return matchesEventPath(row.matchEvent.id);
  }
  if (row.action === "blocked") {
    return teamOperationsScheduleEventPath(row.scheduleEventId);
  }
  return matchesImportPath(row.scheduleEventId);
}

export function dualScoreSummary(matchEvent: MatchEvent | null): string | null {
  if (!matchEvent || matchEvent.eventType !== "dual") return null;
  const d = matchEvent.reportedTeamScoreDenison ?? matchEvent.calculatedTeamScoreDenison;
  const o = matchEvent.reportedTeamScoreOpponent ?? matchEvent.calculatedTeamScoreOpponent;
  if (d == null || o == null) return null;
  return `${d}–${o}`;
}

export function tournamentResultSummary(resultCount: number): string {
  if (resultCount === 0) return "0 results";
  return `${resultCount} result${resultCount === 1 ? "" : "s"}`;
}
