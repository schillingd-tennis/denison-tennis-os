import type { TeamScheduleEvent } from "./types";

export function sortScheduleEvents(events: readonly TeamScheduleEvent[]): TeamScheduleEvent[] {
  return [...events].sort((a, b) => {
    const dateCompare = a.startDate.localeCompare(b.startDate);
    if (dateCompare !== 0) return dateCompare;
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
