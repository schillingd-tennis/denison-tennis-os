import {
  applyFilters,
  isAllActive,
  resolveFilterSelection,
  type FilterDefinition,
} from "@/lib/filtering";

import type { ScheduleViewMode } from "./directorySessionState";
import type { TeamScheduleEvent } from "./types";
import { isTeamMatchType } from "./types";
import { scheduleViewMatches } from "./views";

export const SCHEDULE_FILTER_CLEAR_ID = "all";

export const DEFAULT_ACTIVE_SCHEDULE_FILTERS: readonly string[] = Object.freeze([]);

export const SCHEDULE_FILTER_STORAGE_KEY = "denison-tennis-os:team-schedule-filter";

export const SCHEDULE_TOOLBAR_FILTER_GROUPS: readonly { category: string; label: string }[] = [
  { category: "seasonSegment", label: "Season" },
  { category: "eventType", label: "Event Type" },
  { category: "conference", label: "Conference" },
  { category: "site", label: "Site" },
  { category: "status", label: "Status" },
  { category: "doubleheader", label: "Doubleheader" },
  { category: "countable", label: "Countable Date" },
  { category: "officials", label: "Officials" },
];

export function buildScheduleFilterDefinitions(): FilterDefinition<TeamScheduleEvent>[] {
  return [
    { id: "seasonSegment:fall", label: "Fall", category: "seasonSegment", predicate: (e) => e.seasonSegment === "fall" },
    { id: "seasonSegment:spring", label: "Spring", category: "seasonSegment", predicate: (e) => e.seasonSegment === "spring" },
    { id: "seasonSegment:postseason", label: "Postseason", category: "seasonSegment", predicate: (e) => e.seasonSegment === "postseason" },
    { id: "eventType:team_match", label: "Team Match", category: "eventType", predicate: (e) => isTeamMatchType(e.eventType) },
    { id: "eventType:tournament", label: "Tournament", category: "eventType", predicate: (e) => e.eventType === "tournament" },
    { id: "eventType:non_team_event", label: "Non-Team Event", category: "eventType", predicate: (e) => e.eventType === "non_team_event" },
    { id: "conference:ncac", label: "NCAC", category: "conference", predicate: (e) => e.ncac },
    { id: "conference:nonConference", label: "Non-Conference", category: "conference", predicate: (e) => !e.ncac && isTeamMatchType(e.eventType) },
    { id: "site:home", label: "Home", category: "site", predicate: (e) => e.siteDesignation === "home" },
    { id: "site:away", label: "Away", category: "site", predicate: (e) => e.siteDesignation === "away" },
    { id: "site:neutral", label: "Neutral", category: "site", predicate: (e) => e.siteDesignation === "neutral" },
    { id: "status:confirmed", label: "Confirmed", category: "status", predicate: (e) => e.status === "confirmed" },
    { id: "status:tentative", label: "Tentative", category: "status", predicate: (e) => e.status === "tentative" },
    { id: "status:tbd", label: "TBD", category: "status", predicate: (e) => e.status === "tbd" },
    { id: "status:cancelled", label: "Cancelled", category: "status", predicate: (e) => e.status === "cancelled" },
    { id: "doubleheader:confirmed", label: "Confirmed", category: "doubleheader", predicate: (e) => e.doubleheaderStatus === "confirmed" },
    { id: "doubleheader:potential", label: "Potential", category: "doubleheader", predicate: (e) => e.doubleheaderStatus === "potential" },
    { id: "doubleheader:none", label: "None", category: "doubleheader", predicate: (e) => e.doubleheaderStatus === "none" },
    { id: "countable:yes", label: "Counts", category: "countable", predicate: (e) => e.countsAsCompetitionDate },
    { id: "countable:no", label: "Does Not Count", category: "countable", predicate: (e) => !e.countsAsCompetitionDate },
    { id: "officials:needed", label: "Officials Needed", category: "officials", predicate: (e) => (e.officialsNeeded ?? 0) > 0 },
    { id: "officials:none", label: "No Officials Needed", category: "officials", predicate: (e) => !e.officialsNeeded },
  ];
}

export function scheduleFilterIdsForCategory(
  definitions: readonly FilterDefinition<TeamScheduleEvent>[],
  category: string,
): string[] {
  return definitions.filter((definition) => definition.category === category).map((definition) => definition.id);
}

export function normalizeActiveScheduleFilters(raw: unknown, allowedIds: readonly string[]): string[] {
  const allowed = new Set(allowedIds);
  if (!Array.isArray(raw)) return [...DEFAULT_ACTIVE_SCHEDULE_FILTERS];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && allowed.has(id)))];
}

let snapshot: readonly string[] = DEFAULT_ACTIVE_SCHEDULE_FILTERS;
let hydrated = false;

function parseStoredFilters(raw: string | null): readonly string[] {
  if (raw === null) return DEFAULT_ACTIVE_SCHEDULE_FILTERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ACTIVE_SCHEDULE_FILTERS;
    const ids = [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
    return ids.length === 0 ? DEFAULT_ACTIVE_SCHEDULE_FILTERS : Object.freeze(ids);
  } catch {
    return DEFAULT_ACTIVE_SCHEDULE_FILTERS;
  }
}

function ensureHydrated(): void {
  if (hydrated) return;
  if (typeof window === "undefined") {
    snapshot = DEFAULT_ACTIVE_SCHEDULE_FILTERS;
    hydrated = true;
    return;
  }
  try {
    snapshot = parseStoredFilters(window.localStorage.getItem(SCHEDULE_FILTER_STORAGE_KEY));
  } catch {
    snapshot = DEFAULT_ACTIVE_SCHEDULE_FILTERS;
  }
  hydrated = true;
}

export function readStoredActiveScheduleFilters(): readonly string[] {
  ensureHydrated();
  return snapshot;
}

export function readServerActiveScheduleFilters(): readonly string[] {
  return DEFAULT_ACTIVE_SCHEDULE_FILTERS;
}

const filterListeners = new Set<() => void>();

export function subscribeScheduleFilters(onStoreChange: () => void): () => void {
  filterListeners.add(onStoreChange);
  return () => {
    filterListeners.delete(onStoreChange);
  };
}

export function writeStoredActiveScheduleFilters(activeIds: readonly string[]): void {
  if (typeof window === "undefined") return;
  const next =
    activeIds.length === 0 ? DEFAULT_ACTIVE_SCHEDULE_FILTERS : Object.freeze([...activeIds]);
  snapshot = next;
  hydrated = true;
  try {
    window.localStorage.setItem(SCHEDULE_FILTER_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Private mode / quota.
  }
  for (const listener of filterListeners) listener();
}

export function resolveScheduleFilterSelection(activeIds: readonly string[], clickedId: string): string[] {
  return resolveFilterSelection(activeIds, clickedId, SCHEDULE_FILTER_CLEAR_ID);
}

export function scheduleFiltersAreAll(activeIds: readonly string[]): boolean {
  return isAllActive(activeIds);
}

export function scheduleSearchHaystack(event: TeamScheduleEvent): string {
  return [
    event.opponentName,
    event.eventName,
    event.locationText,
    event.venueName,
    event.city,
    event.state,
    event.notes,
    event.teamsInEvent,
    event.competitionDateNumber != null ? `#${event.competitionDateNumber}` : null,
    event.ncac ? "NCAC" : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesScheduleSearch(event: TeamScheduleEvent, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return scheduleSearchHaystack(event).includes(needle);
}

export function filterScheduleEvents(
  events: readonly TeamScheduleEvent[],
  {
    activeFilterIds,
    query,
    definitions,
    view,
  }: {
    activeFilterIds: readonly string[];
    query: string;
    definitions: readonly FilterDefinition<TeamScheduleEvent>[];
    view: ScheduleViewMode;
  },
): TeamScheduleEvent[] {
  return applyFilters(events, definitions, activeFilterIds)
    .filter((event) => scheduleViewMatches(view, event))
    .filter((event) => matchesScheduleSearch(event, query));
}

/** @deprecated Use normalizeActiveScheduleFilters */
export function sanitizeScheduleFilterIds(
  activeFilterIds: readonly string[],
  definitions: readonly FilterDefinition<TeamScheduleEvent>[],
): string[] {
  return normalizeActiveScheduleFilters(
    activeFilterIds,
    definitions.map((definition) => definition.id),
  );
}
