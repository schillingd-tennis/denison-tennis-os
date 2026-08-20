/**
 * People filter definitions for the shared faceted filtering engine (BP-024G / BP-025A).
 * Predicates use lookup keys — status and role are never inferred from each other.
 */

import {
  applyFilters,
  isAllActive,
  resolveFilterSelection,
  type FilterDefinition,
} from "@/lib/filtering";
import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { LookupRecord } from "@/features/lookups/types";

import type { Person } from "./types";
import { hasRole, isTeamDirectoryPerson, matchesSearch } from "./utils";

/** Build filter definitions from live lookup tables (labels from DB). */
export function buildPeopleFilterDefinitions(
  roles: readonly LookupRecord[],
  statuses: readonly LookupRecord[],
): FilterDefinition<Person>[] {
  const statusDefs: FilterDefinition<Person>[] = statuses.map((status) => ({
    id: status.key,
    label: status.label,
    category: "status",
    predicate: (person) => person.status.key === status.key,
  }));

  const roleDefs: FilterDefinition<Person>[] = roles.map((role) => {
    const toolbar =
      role.key === ROLE_KEYS.coach
        ? { id: "coaches", label: "Coaches" }
        : role.key === ROLE_KEYS.player
          ? { id: "players", label: "Players" }
          : { id: role.key, label: role.label };
    return {
      id: toolbar.id,
      label: toolbar.label,
      category: "role",
      predicate: (person) => hasRole(person, role.key),
    };
  });

  return [...statusDefs, ...roleDefs];
}

/**
 * Fallback definitions when lookups have not loaded yet.
 * Keys match seeded lookup keys; labels match seed labels.
 */
export const PEOPLE_FILTER_DEFINITIONS: FilterDefinition<Person>[] = [
  {
    id: STATUS_KEYS.current,
    label: "Current",
    category: "status",
    predicate: (person) => person.status.key === STATUS_KEYS.current,
  },
  {
    id: STATUS_KEYS.former,
    label: "Former",
    category: "status",
    predicate: (person) => person.status.key === STATUS_KEYS.former,
  },
  {
    id: "players",
    label: "Players",
    category: "role",
    predicate: (person) => hasRole(person, ROLE_KEYS.player),
  },
  {
    id: "coaches",
    label: "Coaches",
    category: "role",
    predicate: (person) => hasRole(person, ROLE_KEYS.coach),
  },
  {
    id: ROLE_KEYS.recruit,
    label: "Recruit",
    category: "role",
    predicate: (person) => hasRole(person, ROLE_KEYS.recruit),
  },
  {
    id: ROLE_KEYS.staff,
    label: "Staff",
    category: "role",
    predicate: (person) => hasRole(person, ROLE_KEYS.staff),
  },
  {
    id: ROLE_KEYS.alumni,
    label: "Alumni",
    category: "role",
    predicate: (person) => hasRole(person, ROLE_KEYS.alumni),
  },
  {
    id: ROLE_KEYS.family,
    label: "Family",
    category: "role",
    predicate: (person) => hasRole(person, ROLE_KEYS.family),
  },
];

/** Special clear control — not a facet predicate. */
export const PEOPLE_FILTER_CLEAR_ID = "all";

/**
 * Team toolbar facets within Team membership: Current | Players | Coaches | All.
 * Membership (player|coach) is applied before facets — All = all Team members,
 * not every Person in the database. Never infer status from role.
 */
export const TEAM_PHASE1_FILTER_IDS = [
  STATUS_KEYS.current,
  "players",
  "coaches",
] as const;

export type TeamPhase1FilterId = (typeof TEAM_PHASE1_FILTER_IDS)[number];

/** Compact Rank-style toolbar facets: Status + Role. Includes Former (existing status). */
export const PEOPLE_TOOLBAR_FILTER_IDS = [
  STATUS_KEYS.current,
  STATUS_KEYS.former,
  "players",
  "coaches",
] as const;

export type PeopleToolbarFacetId = (typeof PEOPLE_TOOLBAR_FILTER_IDS)[number];

export type PeopleToolbarFilterId = typeof PEOPLE_FILTER_CLEAR_ID | PeopleToolbarFacetId;

export const PEOPLE_VISIBLE_FILTER_FACETS: readonly { category: string; label: string }[] = [
  { category: "status", label: "Status" },
  { category: "role", label: "Role" },
];

export const DEFAULT_ACTIVE_PEOPLE_FILTERS: string[] = [STATUS_KEYS.current];

export const PEOPLE_FILTER_STORAGE_KEY = "denison-tennis-os:people-filter";

const PEOPLE_TOOLBAR_ID_SET = new Set<string>(PEOPLE_TOOLBAR_FILTER_IDS);

export function peopleToolbarFilterIdsForCategory(category: string): string[] {
  return PEOPLE_FILTER_DEFINITIONS.filter(
    (definition) =>
      definition.category === category && PEOPLE_TOOLBAR_ID_SET.has(definition.id),
  ).map((definition) => definition.id);
}

export function peopleFiltersAreAll(activeIds: readonly string[]): boolean {
  return isAllActive(activeIds);
}

/** Toolbar options derived from filter definitions (plus All). */
export function getTeamPhase1FilterOptions(
  definitions: readonly FilterDefinition<Person>[] = PEOPLE_FILTER_DEFINITIONS,
): {
  value: PeopleToolbarFilterId;
  label: string;
}[] {
  const facets = TEAM_PHASE1_FILTER_IDS.map((id) => {
    const definition = definitions.find((entry) => entry.id === id);
    return {
      value: id,
      label: definition?.label ?? id,
    };
  });

  return [{ value: PEOPLE_FILTER_CLEAR_ID, label: "All" }, ...facets];
}

export function normalizeActivePeopleFilters(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [...DEFAULT_ACTIVE_PEOPLE_FILTERS];

  if (typeof raw === "string") {
    if (raw === "players") return [STATUS_KEYS.current];
    if (raw === "all") return [];
    if (PEOPLE_TOOLBAR_ID_SET.has(raw)) return [raw];
    return [...DEFAULT_ACTIVE_PEOPLE_FILTERS];
  }

  if (!Array.isArray(raw)) return [...DEFAULT_ACTIVE_PEOPLE_FILTERS];

  const next = raw.filter(
    (id): id is string => typeof id === "string" && PEOPLE_TOOLBAR_ID_SET.has(id),
  );

  return [...new Set(next)];
}

export function readStoredActivePeopleFilters(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_ACTIVE_PEOPLE_FILTERS];
  try {
    const raw = window.localStorage.getItem(PEOPLE_FILTER_STORAGE_KEY);
    if (raw === null) return [...DEFAULT_ACTIVE_PEOPLE_FILTERS];

    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    const normalized = normalizeActivePeopleFilters(parsed);
    const serialized = JSON.stringify(normalized);
    if (raw !== serialized) {
      window.localStorage.setItem(PEOPLE_FILTER_STORAGE_KEY, serialized);
    }
    return normalized;
  } catch {
    return [...DEFAULT_ACTIVE_PEOPLE_FILTERS];
  }
}

export function writeStoredActivePeopleFilters(activeIds: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeActivePeopleFilters(activeIds);
    window.localStorage.setItem(PEOPLE_FILTER_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Private mode / quota — in-memory filters still work for this session.
  }
}

export function resolvePeopleFilterSelection(
  activeIds: readonly string[],
  clickedId: string,
): string[] {
  return resolveFilterSelection(activeIds, clickedId, PEOPLE_FILTER_CLEAR_ID);
}

/** Visual pressed segments: All when no facets, otherwise the active facets. */
export function getPeopleFilterVisualSelection(
  activeIds: readonly string[],
): PeopleToolbarFilterId[] {
  if (isAllActive(activeIds)) return [PEOPLE_FILTER_CLEAR_ID];
  return activeIds.filter((id): id is PeopleToolbarFacetId =>
    PEOPLE_TOOLBAR_ID_SET.has(id),
  );
}

/** List/Rank-style context subtitle under the Roster heading. */
export function peopleDirectoryContextLabel(
  activeIds: readonly string[],
): string {
  if (isAllActive(activeIds)) return "All Members";

  const hasCurrent = activeIds.includes(STATUS_KEYS.current);
  const hasFormer = activeIds.includes(STATUS_KEYS.former);
  const hasPlayers = activeIds.includes("players");
  const hasCoaches = activeIds.includes("coaches");

  const statusBits = [
    hasCurrent ? "Current" : null,
    hasFormer ? "Former" : null,
  ].filter((part): part is string => Boolean(part));
  const status = statusBits.join(" & ");

  const role =
    hasPlayers && hasCoaches
      ? "Players & Coaches"
      : hasPlayers
        ? "Players"
        : hasCoaches
          ? "Coaches"
          : "Members";

  if (!hasPlayers && !hasCoaches) {
    return status ? `${status} Members` : "Members";
  }
  return status ? `${status} ${role}` : role;
}

/**
 * Team membership first, then facet filters (OR within category, AND across),
 * then search, then sort. Cards and List must share this result set (BP-025D).
 *
 * Empty `activeFilterIds` ("All") means all Team members, not all People.
 */
export function filterPeople(
  people: Person[],
  {
    activeFilterIds,
    query,
    definitions = PEOPLE_FILTER_DEFINITIONS,
  }: {
    activeFilterIds: readonly string[];
    query: string;
    definitions?: readonly FilterDefinition<Person>[];
  },
): Person[] {
  const teamMembers = people.filter(isTeamDirectoryPerson);
  return applyFilters(teamMembers, definitions, activeFilterIds)
    .filter((person) => matchesSearch(person, query))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}
