/**
 * Schedule ↔ Matches linking helpers (pure).
 * Schedule owns event identity; Matches owns official results.
 */

import {
  displayOpponentOrEvent,
  isTeamMatchType,
  isTournamentOrEventType,
  type ScheduleEventType,
  type TeamScheduleEvent,
} from "@/features/teamSchedule/types";

import type {
  MatchEvent,
  MatchEventType,
  MatchSeasonSegment,
  MatchSite,
  MatchesImportDraft,
  ScheduleEventSnapshot,
} from "./types";

/** Competitive Schedule types for Matches — by type, not name heuristics. */
export function isCompetitiveScheduleEvent(event: TeamScheduleEvent): boolean {
  return (
    event.eventType === "team_match" ||
    event.eventType === "tournament" ||
    event.eventType === "team_match_placeholder"
  );
}

export type ScheduleResultsFormat =
  | { status: "dual"; ambiguous: false }
  | { status: "tournament"; ambiguous: false }
  | { status: "ambiguous"; ambiguous: true; reason: string; scheduleType: ScheduleEventType };

export function scheduleResultsFormat(event: TeamScheduleEvent): ScheduleResultsFormat {
  if (event.eventType === "team_match_placeholder") {
    return {
      status: "ambiguous",
      ambiguous: true,
      reason:
        "This Schedule event is a Team Match Placeholder. Confirm the event type on Schedule (Team Match vs Tournament) before importing results.",
      scheduleType: event.eventType,
    };
  }
  if (isTeamMatchType(event.eventType)) {
    return { status: "dual", ambiguous: false };
  }
  if (isTournamentOrEventType(event.eventType)) {
    return { status: "tournament", ambiguous: false };
  }
  return {
    status: "ambiguous",
    ambiguous: true,
    reason: `Schedule type “${event.eventType}” does not map cleanly to Dual or Tournament. Edit the Schedule event type before importing.`,
    scheduleType: event.eventType,
  };
}

export function matchEventTypeFromSchedule(event: TeamScheduleEvent): MatchEventType | null {
  const format = scheduleResultsFormat(event);
  if (format.ambiguous) return null;
  return format.status;
}

export function buildScheduleSnapshot(event: TeamScheduleEvent): ScheduleEventSnapshot {
  return {
    id: event.id,
    eventType: event.eventType,
    opponentName: event.opponentName,
    eventName: event.eventName,
    seasonYear: event.seasonYear,
    seasonSegment: event.seasonSegment,
    startDate: event.startDate,
    endDate: event.endDate,
    siteDesignation: event.siteDesignation,
    venueName: event.venueName,
    locationText: event.locationText,
    city: event.city,
    state: event.state,
    capturedAt: new Date().toISOString(),
  };
}

/** Display fields prefer live Schedule when linked; fall back to Matches snapshot / columns. */
export function resolveMatchEventDisplay(
  event: MatchEvent,
  schedule: TeamScheduleEvent | null | undefined,
): {
  title: string;
  opposingTeamName: string | null;
  seasonYear: number;
  seasonSegment: MatchSeasonSegment | null;
  startDate: string;
  endDate: string | null;
  site: MatchSite | null;
  locationText: string | null;
  venueName: string | null;
  fromSchedule: boolean;
} {
  if (schedule && event.scheduleEventId === schedule.id) {
    return {
      title: displayOpponentOrEvent(schedule),
      opposingTeamName: isTeamMatchType(schedule.eventType) ? schedule.opponentName : null,
      seasonYear: schedule.seasonYear,
      seasonSegment: schedule.seasonSegment,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      site: schedule.siteDesignation,
      locationText:
        schedule.locationText?.trim() ||
        [schedule.venueName, schedule.city, schedule.state].filter(Boolean).join(", ") ||
        null,
      venueName: schedule.venueName,
      fromSchedule: true,
    };
  }

  const snap = event.scheduleSnapshot;
  if (snap && !event.scheduleEventId) {
    return {
      title: snap.opponentName ?? snap.eventName ?? event.title,
      opposingTeamName: snap.opponentName,
      seasonYear: snap.seasonYear,
      seasonSegment: snap.seasonSegment,
      startDate: snap.startDate,
      endDate: snap.endDate,
      site: snap.siteDesignation,
      locationText:
        snap.locationText?.trim() ||
        [snap.venueName, snap.city, snap.state].filter(Boolean).join(", ") ||
        null,
      venueName: snap.venueName,
      fromSchedule: false,
    };
  }

  return {
    title: event.eventType === "dual" ? event.opposingTeamName?.trim() || event.title : event.title,
    opposingTeamName: event.opposingTeamName,
    seasonYear: event.seasonYear,
    seasonSegment: event.seasonSegment,
    startDate: event.startDate,
    endDate: event.endDate,
    site: event.site,
    locationText: event.locationText,
    venueName: event.venueName,
    fromSchedule: false,
  };
}

export type ImportScheduleConflict = {
  code:
    | "opponent_mismatch"
    | "title_mismatch"
    | "date_outside_range"
    | "type_mismatch"
    | "ambiguous_schedule_type";
  message: string;
};

export function flagImportScheduleConflicts(
  draft: MatchesImportDraft,
  schedule: TeamScheduleEvent,
): ImportScheduleConflict[] {
  const conflicts: ImportScheduleConflict[] = [];
  const format = scheduleResultsFormat(schedule);

  if (format.ambiguous) {
    conflicts.push({
      code: "ambiguous_schedule_type",
      message: format.reason,
    });
  } else if (draft.kind !== format.status) {
    conflicts.push({
      code: "type_mismatch",
      message: `Paste/draft is ${draft.kind} but Schedule event is ${format.status}. Edit the Schedule event type or switch Schedule events — types are not silently overridden.`,
    });
  }

  if (draft.kind === "dual") {
    const draftOpp = draft.opposingTeamName?.trim().toLowerCase() ?? "";
    const schedOpp = (schedule.opponentName ?? "").trim().toLowerCase();
    if (draftOpp && schedOpp && draftOpp !== schedOpp && !schedOpp.includes(draftOpp) && !draftOpp.includes(schedOpp)) {
      conflicts.push({
        code: "opponent_mismatch",
        message: `Draft opponent “${draft.opposingTeamName}” differs from Schedule “${schedule.opponentName}”. Schedule remains source of truth for opponent name.`,
      });
    }
  } else {
    const draftTitle = draft.title?.trim().toLowerCase() ?? "";
    const schedTitle = displayOpponentOrEvent(schedule).trim().toLowerCase();
    if (draftTitle && schedTitle && draftTitle !== schedTitle && !schedTitle.includes(draftTitle) && !draftTitle.includes(schedTitle)) {
      conflicts.push({
        code: "title_mismatch",
        message: `Draft title “${draft.title}” differs from Schedule “${displayOpponentOrEvent(schedule)}”. Schedule remains source of truth for the event name.`,
      });
    }
  }

  const draftDate =
    draft.kind === "dual" ? draft.startDate : draft.startDate ?? draft.endDate;
  if (draftDate) {
    if (draftDate < schedule.startDate || draftDate > schedule.endDate) {
      conflicts.push({
        code: "date_outside_range",
        message: `Draft date ${draftDate} is outside Schedule range ${schedule.startDate}–${schedule.endDate}.`,
      });
    }
  }

  return conflicts;
}

export type ScheduleLinkSuggestion = {
  schedule: TeamScheduleEvent;
  score: number;
  reasons: string[];
};

export function suggestScheduleLinks(
  event: MatchEvent,
  candidates: readonly TeamScheduleEvent[],
  alreadyLinkedIds: ReadonlySet<string>,
): ScheduleLinkSuggestion[] {
  const suggestions: ScheduleLinkSuggestion[] = [];

  for (const schedule of candidates) {
    if (alreadyLinkedIds.has(schedule.id) && event.scheduleEventId !== schedule.id) {
      continue;
    }
    let score = 0;
    const reasons: string[] = [];

    if (schedule.seasonYear === event.seasonYear) {
      score += 2;
      reasons.push("same season");
    }

    const expectedType = matchEventTypeFromSchedule(schedule);
    if (expectedType === event.eventType) {
      score += 3;
      reasons.push("matching type");
    }

    const schedName = displayOpponentOrEvent(schedule).toLowerCase();
    const matchName = (
      event.opposingTeamName ??
      event.title ??
      event.scheduleSnapshot?.opponentName ??
      event.scheduleSnapshot?.eventName ??
      ""
    ).toLowerCase();
    if (schedName && matchName && (schedName === matchName || schedName.includes(matchName) || matchName.includes(schedName))) {
      score += 4;
      reasons.push("name/opponent");
    }

    if (event.startDate >= schedule.startDate && event.startDate <= schedule.endDate) {
      score += 3;
      reasons.push("date in range");
    } else if (event.startDate === schedule.startDate) {
      score += 2;
      reasons.push("same start date");
    }

    if (score >= 4) {
      suggestions.push({ schedule, score, reasons });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 8);
}

export function filterScheduleEventsForPicker(
  events: readonly TeamScheduleEvent[],
  query: string,
  seasonYear: number | "all",
): TeamScheduleEvent[] {
  const q = query.trim().toLowerCase();
  return events.filter((event) => {
    if (!isCompetitiveScheduleEvent(event)) return false;
    if (seasonYear !== "all" && event.seasonYear !== seasonYear) return false;
    if (!q) return true;
    const hay = [
      displayOpponentOrEvent(event),
      event.opponentName,
      event.eventName,
      event.venueName,
      event.locationText,
      event.city,
      event.state,
      event.eventType,
      event.startDate,
      event.endDate,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function identityFieldsFromSchedule(
  schedule: TeamScheduleEvent,
  eventType: MatchEventType,
): Pick<
  MatchEvent,
  | "title"
  | "opposingTeamName"
  | "seasonYear"
  | "seasonSegment"
  | "startDate"
  | "endDate"
  | "site"
  | "locationText"
  | "venueName"
> {
  const title = displayOpponentOrEvent(schedule);
  return {
    title: title === "—" ? (eventType === "dual" ? "Dual match" : "Tournament") : title,
    opposingTeamName: eventType === "dual" ? schedule.opponentName : null,
    seasonYear: schedule.seasonYear,
    seasonSegment: schedule.seasonSegment,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    site: schedule.siteDesignation,
    locationText:
      schedule.locationText?.trim() ||
      [schedule.venueName, schedule.city, schedule.state].filter(Boolean).join(", ") ||
      null,
    venueName: schedule.venueName,
  };
}
