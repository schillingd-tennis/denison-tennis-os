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
import { hasRole, matchesSearch } from "./utils";

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
 * Team toolbar: Current | Players | Coaches | Alumni | All.
 * Current = status; Players/Coaches/Alumni = role. Never infer status from role.
 */
export const TEAM_PHASE1_FILTER_IDS = [
  STATUS_KEYS.current,
  "players",
  "coaches",
  ROLE_KEYS.alumni,
] as const;

export type TeamPhase1FilterId = (typeof TEAM_PHASE1_FILTER_IDS)[number];

export type PeopleToolbarFilterId = typeof PEOPLE_FILTER_CLEAR_ID | TeamPhase1FilterId;

export const DEFAULT_ACTIVE_PEOPLE_FILTERS: string[] = [STATUS_KEYS.current];

export const PEOPLE_FILTER_STORAGE_KEY = "denison-tennis-os:people-filter";

const TEAM_PHASE1_ID_SET = new Set<string>(TEAM_PHASE1_FILTER_IDS);

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
    if (TEAM_PHASE1_ID_SET.has(raw)) return [raw];
    return [...DEFAULT_ACTIVE_PEOPLE_FILTERS];
  }

  if (!Array.isArray(raw)) return [...DEFAULT_ACTIVE_PEOPLE_FILTERS];

  const next = raw.filter(
    (id): id is string => typeof id === "string" && TEAM_PHASE1_ID_SET.has(id),
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
  return activeIds.filter((id): id is TeamPhase1FilterId =>
    TEAM_PHASE1_ID_SET.has(id),
  );
}

/**
 * Facet filters first (OR within category, AND across), then search, then sort.
 * Cards and List must share this result set (BP-025D).
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
  return applyFilters(people, definitions, activeFilterIds)
    .filter((person) => matchesSearch(person, query))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}
