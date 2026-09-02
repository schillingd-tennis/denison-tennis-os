import type { InlineSelectOption } from "@/components/inline-edit";

import {
  DOUBLEHEADER_STATUSES,
  SCHEDULE_EVENT_TYPES,
  SCHEDULE_STATUSES,
  SITE_DESIGNATIONS,
  type DoubleheaderStatus,
  type ScheduleEventType,
  type ScheduleStatus,
  type SiteDesignation,
  type TeamScheduleEvent,
  type TeamScheduleEventInput,
} from "./types";

export const SCHEDULE_INLINE_EDITABLE_FIELDS = [
  "competitionDateNumber",
  "opponentOrEvent",
  "itaRank",
  "siteDesignation",
  "timeText",
  "eventType",
  "status",
  "doubleheaderStatus",
  "officialsNeeded",
] as const;

export type ScheduleInlineEditableField = (typeof SCHEDULE_INLINE_EDITABLE_FIELDS)[number];

export const SITE_SELECT_OPTIONS: InlineSelectOption[] = SITE_DESIGNATIONS.map((value) => ({
  value,
  label: value === "home" ? "Home" : value === "away" ? "Away" : "Neutral",
}));

export const INLINE_EVENT_TYPE_OPTIONS: InlineSelectOption[] = (
  ["team_match", "tournament", "non_team_event"] as const satisfies readonly ScheduleEventType[]
).map((value) => ({
  value,
  label:
    value === "team_match" ? "Team Match" : value === "tournament" ? "Tournament" : "Non-Team Event",
}));

export const STATUS_SELECT_OPTIONS: InlineSelectOption[] = SCHEDULE_STATUSES.map((value) => ({
  value,
  label:
    value === "confirmed"
      ? "Confirmed"
      : value === "tentative"
        ? "Tentative"
        : value === "tbd"
          ? "TBD"
          : "Cancelled",
}));

export const DOUBLEHEADER_SELECT_OPTIONS: InlineSelectOption[] = DOUBLEHEADER_STATUSES.map((value) => ({
  value,
  label:
    value === "none" ? "None" : value === "potential" ? "Potential DH" : "Confirmed DH",
}));

export function scheduleEventToInput(event: TeamScheduleEvent): TeamScheduleEventInput {
  return {
    seasonYear: event.seasonYear,
    competitionDateNumber: event.competitionDateNumber,
    competitionDateGroup: event.competitionDateGroup,
    eventType: event.eventType,
    opponentName: event.opponentName,
    eventName: event.eventName,
    itaRank: event.itaRank,
    startDate: event.startDate,
    endDate: event.endDate,
    timeText: event.timeText,
    venueName: event.venueName,
    city: event.city,
    state: event.state,
    locationText: event.locationText,
    siteDesignation: event.siteDesignation,
    travelRequired: event.travelRequired,
    ncac: event.ncac,
    seasonSegment: event.seasonSegment,
    status: event.status,
    doubleheaderStatus: event.doubleheaderStatus,
    officialsNeeded: event.officialsNeeded,
    teamsInEvent: event.teamsInEvent,
    countsAsCompetitionDate: event.countsAsCompetitionDate,
    notes: event.notes,
    sortOrder: event.sortOrder,
  };
}

export function replaceScheduleEvent(
  events: readonly TeamScheduleEvent[],
  updated: TeamScheduleEvent,
): TeamScheduleEvent[] {
  return events.map((row) => (row.id === updated.id ? updated : row));
}

export function applyInlinePatch(
  event: TeamScheduleEvent,
  patch: Partial<TeamScheduleEventInput>,
): TeamScheduleEvent {
  return { ...event, ...patch };
}

function parseOptionalPositiveInt(raw: string, label: string): number | null | { error: string } {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: `${label} must be a positive whole number.` };
  }
  return parsed;
}

function isInlinePatchError(
  value: number | null | { error: string },
): value is { error: string } {
  return value !== null && typeof value === "object";
}

function isAllowedEnum<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function buildInlinePatch(
  event: TeamScheduleEvent,
  field: ScheduleInlineEditableField,
  raw: string,
): { patch: Partial<TeamScheduleEventInput> } | { error: string } {
  switch (field) {
    case "competitionDateNumber": {
      if (!event.countsAsCompetitionDate) {
        return { error: "This event does not use a competition date number." };
      }
      const parsed = parseOptionalPositiveInt(raw.replace(/^#/, ""), "Competition date number");
      if (isInlinePatchError(parsed)) return parsed;
      if (parsed === null) return { error: "Competition date number is required." };
      return {
        patch: {
          competitionDateNumber: parsed,
          competitionDateGroup: event.competitionDateGroup,
        },
      };
    }
    case "itaRank": {
      const parsed = parseOptionalPositiveInt(raw.replace(/^#/, ""), "ITA rank");
      if (isInlinePatchError(parsed)) return parsed;
      return { patch: { itaRank: parsed } };
    }
    case "siteDesignation": {
      if (!isAllowedEnum(raw, SITE_DESIGNATIONS)) {
        return { error: "Select a valid site." };
      }
      return { patch: { siteDesignation: raw as SiteDesignation } };
    }
    case "timeText": {
      return { patch: { timeText: raw.trim() || null } };
    }
    case "eventType": {
      if (!isAllowedEnum(raw, SCHEDULE_EVENT_TYPES) || raw === "team_match_placeholder") {
        return { error: "Select a valid event type." };
      }
      return { patch: { eventType: raw as ScheduleEventType } };
    }
    case "status": {
      if (!isAllowedEnum(raw, SCHEDULE_STATUSES)) {
        return { error: "Select a valid status." };
      }
      return { patch: { status: raw as ScheduleStatus } };
    }
    case "doubleheaderStatus": {
      if (!isAllowedEnum(raw, DOUBLEHEADER_STATUSES)) {
        return { error: "Select a valid doubleheader status." };
      }
      return { patch: { doubleheaderStatus: raw as DoubleheaderStatus } };
    }
    case "officialsNeeded": {
      const parsed = parseOptionalPositiveInt(raw, "Officials needed");
      if (isInlinePatchError(parsed)) return parsed;
      return { patch: { officialsNeeded: parsed } };
    }
    case "opponentOrEvent": {
      const next = raw.trim();
      if (!next) return { error: "Enter an opponent or event name." };
      if (event.opponentName != null || event.eventType === "team_match") {
        return { patch: { opponentName: next, eventName: event.eventName } };
      }
      return { patch: { eventName: next, opponentName: event.opponentName } };
    }
    default:
      return { error: "Unsupported field." };
  }
}

export function inlinePatchIsNoOp(
  event: TeamScheduleEvent,
  patch: Partial<TeamScheduleEventInput>,
): boolean {
  return (Object.keys(patch) as (keyof TeamScheduleEventInput)[]).every((key) => {
    const next = patch[key];
    const current = event[key as keyof TeamScheduleEvent];
    return Object.is(next, current);
  });
}
