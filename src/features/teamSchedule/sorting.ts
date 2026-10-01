import type { TeamScheduleEvent } from "./types";

const UNKNOWN_TIME_SORT_VALUE = Number.MAX_SAFE_INTEGER;

/** Minutes after midnight for chronological same-day ordering. */
export function scheduleTimeSortValue(timeText: string | null): number {
  if (!timeText) return UNKNOWN_TIME_SORT_VALUE;
  const normalized = timeText.trim().toUpperCase().replaceAll(".", "");
  if (!normalized || normalized === "TBD" || normalized === "TBA") {
    return UNKNOWN_TIME_SORT_VALUE;
  }
  if (normalized === "ALL DAY") return 0;

  const twelveHour = normalized.match(
    /^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)(?:\s+[A-Z]{2,4})?$/,
  );
  if (twelveHour) {
    const rawHour = Number(twelveHour[1]);
    if (rawHour < 1 || rawHour > 12) return UNKNOWN_TIME_SORT_VALUE;
    const minute = Number(twelveHour[2] ?? 0);
    const hour = (rawHour % 12) + (twelveHour[3] === "PM" ? 12 : 0);
    return hour * 60 + minute;
  }

  const twentyFourHour = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) {
    return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
  }

  return UNKNOWN_TIME_SORT_VALUE;
}

export function sortScheduleEvents(events: readonly TeamScheduleEvent[]): TeamScheduleEvent[] {
  return [...events].sort((a, b) => {
    const dateCompare = a.startDate.localeCompare(b.startDate);
    if (dateCompare !== 0) return dateCompare;
    const timeCompare = scheduleTimeSortValue(a.timeText) - scheduleTimeSortValue(b.timeText);
    if (timeCompare !== 0) return timeCompare;
    const compA = a.competitionDateNumber ?? Number.MAX_SAFE_INTEGER;
    const compB = b.competitionDateNumber ?? Number.MAX_SAFE_INTEGER;
    if (compA !== compB) return compA - compB;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}

export function groupAdjacentSharedDates(events: readonly TeamScheduleEvent[]): TeamScheduleEvent[] {
  return sortScheduleEvents(events);
}

export function eventsInSharedGroup(
  events: readonly TeamScheduleEvent[],
  group: string | null,
): TeamScheduleEvent[] {
  if (!group) return [];
  return events.filter((event) => event.competitionDateGroup === group);
}

export function isSharedDateGroup(events: readonly TeamScheduleEvent[], group: string | null): boolean {
  return eventsInSharedGroup(events, group).length > 1;
}
