/**
 * Recruiting directory filters (BP-045).
 *
 * Categories: recruit type, pipeline, interest, outcome, priority, getability,
 * recruit class year. OR within a category, AND across categories.
 */
import {
  applyFilters,
  isAllActive,
  resolveFilterSelection,
  type FilterDefinition,
} from "@/lib/filtering";
import { matchesSearch } from "@/features/people/utils";

import type { RecruitDirectoryRow } from "./directory";
import {
  RECRUIT_GETABILITY_SEED,
  RECRUIT_INTEREST_SEED,
  RECRUIT_OUTCOME_SEED,
  RECRUIT_PIPELINE_SEED,
  RECRUIT_PRIORITY_SEED,
  RECRUIT_TYPE_SEED,
} from "./lookupSeed";

export const RECRUITING_FILTER_CLEAR_ID = "all";

/** Stable empty snapshot for useSyncExternalStore (must be referentially equal). */
export const DEFAULT_ACTIVE_RECRUITING_FILTERS: readonly string[] = Object.freeze([]);

export const RECRUITING_FILTER_STORAGE_KEY = "denison-tennis-os:recruiting-filter";

function lookupFilters(
  seed: readonly { key: string; label: string }[],
  category: string,
  getKey: (row: RecruitDirectoryRow) => string | undefined,
): FilterDefinition<RecruitDirectoryRow>[] {
  return seed.map((entry) => ({
    id: `${category}:${entry.key}`,
    label: entry.label,
    category,
    predicate: (row) => getKey(row) === entry.key,
  }));
}

export function buildRecruitingFilterDefinitions(
  rows: readonly RecruitDirectoryRow[],
): FilterDefinition<RecruitDirectoryRow>[] {
  const years = [
    ...new Set(
      rows
        .map((row) => row.profile.recruitClassYear)
        .filter((year): year is number => typeof year === "number"),
    ),
  ].sort((a, b) => a - b);

  const classYearDefs: FilterDefinition<RecruitDirectoryRow>[] = years.map((year) => ({
    id: `classYear:${year}`,
    label: String(year),
    category: "recruitClassYear",
    predicate: (row) => row.profile.recruitClassYear === year,
  }));

  classYearDefs.push({
    id: "classYear:none",
    label: "No class year",
    category: "recruitClassYear",
    predicate: (row) => row.profile.recruitClassYear === undefined,
  });

  return [
    ...lookupFilters(RECRUIT_TYPE_SEED, "recruitType", (row) => row.profile.recruitType?.key),
    ...lookupFilters(RECRUIT_PIPELINE_SEED, "pipelineStage", (row) => row.profile.pipelineStage?.key),
    ...lookupFilters(RECRUIT_INTEREST_SEED, "interest", (row) => row.profile.interest?.key),
    ...lookupFilters(RECRUIT_OUTCOME_SEED, "outcome", (row) => row.profile.outcome?.key),
    {
      id: "outcome:none",
      label: "No outcome",
      category: "outcome",
      predicate: (row) => !row.profile.outcomeId,
    },
    ...lookupFilters(RECRUIT_PRIORITY_SEED, "priority", (row) => row.profile.priority?.key),
    ...lookupFilters(RECRUIT_GETABILITY_SEED, "getability", (row) => row.profile.getability?.key),
    ...classYearDefs,
  ];
}

export const RECRUITING_FILTER_GROUPS: readonly {
  category: string;
  label: string;
}[] = [
  { category: "recruitType", label: "Recruit Type" },
  { category: "pipelineStage", label: "Pipeline Stage" },
  { category: "interest", label: "Interest" },
  { category: "outcome", label: "Outcome" },
  { category: "priority", label: "Priority" },
  { category: "getability", label: "Getability" },
  { category: "recruitClassYear", label: "Recruit Class Year" },
];

export function recruitingFilterIdsForCategory(
  definitions: readonly FilterDefinition<RecruitDirectoryRow>[],
  category: string,
): string[] {
  return definitions.filter((definition) => definition.category === category).map((definition) => definition.id);
}

export function normalizeActiveRecruitingFilters(
  raw: unknown,
  allowedIds: readonly string[],
): string[] {
  const allowed = new Set(allowedIds);
  if (!Array.isArray(raw)) return [...DEFAULT_ACTIVE_RECRUITING_FILTERS];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && allowed.has(id)))];
}

/** Cached snapshot — getSnapshot must return the same reference until data changes. */
let snapshot: readonly string[] = DEFAULT_ACTIVE_RECRUITING_FILTERS;
let hydrated = false;

function parseStoredFilters(raw: string | null): readonly string[] {
  if (raw === null) return DEFAULT_ACTIVE_RECRUITING_FILTERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ACTIVE_RECRUITING_FILTERS;
    const ids = [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
    return ids.length === 0 ? DEFAULT_ACTIVE_RECRUITING_FILTERS : Object.freeze(ids);
  } catch {
    return DEFAULT_ACTIVE_RECRUITING_FILTERS;
  }
}

function ensureHydrated(): void {
  if (hydrated) return;
  if (typeof window === "undefined") {
    snapshot = DEFAULT_ACTIVE_RECRUITING_FILTERS;
    hydrated = true;
    return;
  }
  try {
    snapshot = parseStoredFilters(window.localStorage.getItem(RECRUITING_FILTER_STORAGE_KEY));
  } catch {
    snapshot = DEFAULT_ACTIVE_RECRUITING_FILTERS;
  }
  hydrated = true;
}

export function readStoredActiveRecruitingFilters(): readonly string[] {
  ensureHydrated();
  return snapshot;
}

export function readServerActiveRecruitingFilters(): readonly string[] {
  return DEFAULT_ACTIVE_RECRUITING_FILTERS;
}

const filterListeners = new Set<() => void>();

export function subscribeRecruitingFilters(onStoreChange: () => void): () => void {
  filterListeners.add(onStoreChange);
  return () => {
    filterListeners.delete(onStoreChange);
  };
}

export function writeStoredActiveRecruitingFilters(activeIds: readonly string[]): void {
  if (typeof window === "undefined") return;
  const next =
    activeIds.length === 0
      ? DEFAULT_ACTIVE_RECRUITING_FILTERS
      : Object.freeze([...activeIds]);
  snapshot = next;
  hydrated = true;
  try {
    window.localStorage.setItem(RECRUITING_FILTER_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Private mode / quota.
  }
  for (const listener of filterListeners) listener();
}

export function resolveRecruitingFilterSelection(
  activeIds: readonly string[],
  clickedId: string,
): string[] {
  return resolveFilterSelection(activeIds, clickedId, RECRUITING_FILTER_CLEAR_ID);
}

export function recruitingFiltersAreAll(activeIds: readonly string[]): boolean {
  return isAllActive(activeIds);
}

export function filterRecruitDirectoryRows(
  rows: readonly RecruitDirectoryRow[],
  {
    activeFilterIds,
    query,
    definitions,
  }: {
    activeFilterIds: readonly string[];
    query: string;
    definitions: readonly FilterDefinition<RecruitDirectoryRow>[];
  },
): RecruitDirectoryRow[] {
  return applyFilters(rows, definitions, activeFilterIds).filter((row) => {
    if (matchesSearch(row.person, query)) return true;
    const haystack = [
      row.profile.recruitType?.label,
      row.profile.pipelineStage?.label,
      row.profile.interest?.label,
      row.profile.outcome?.label,
      row.profile.priority?.label,
      row.profile.getability?.label,
      row.profile.recruitClassYear,
      row.analytics.tier,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
}
