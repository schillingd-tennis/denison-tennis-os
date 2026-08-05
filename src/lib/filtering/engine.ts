import type { FilterDefinition } from "./types";

/**
 * Apply active facet filters with grouped logic (BP-025D):
 * - Within a category → OR
 * - Across categories → AND
 *
 * Empty `activeIds` means "All" — no facet predicates run.
 */
export function applyFilters<T>(
  items: readonly T[],
  definitions: readonly FilterDefinition<T>[],
  activeIds: readonly string[],
): T[] {
  if (activeIds.length === 0) return [...items];

  const activeDefs = activeIds
    .map((id) => definitions.find((definition) => definition.id === id))
    .filter((definition): definition is FilterDefinition<T> => Boolean(definition));

  if (activeDefs.length === 0) return [...items];

  const byCategory = new Map<string, FilterDefinition<T>[]>();
  for (const definition of activeDefs) {
    const group = byCategory.get(definition.category) ?? [];
    group.push(definition);
    byCategory.set(definition.category, group);
  }

  return items.filter((item) =>
    [...byCategory.values()].every((group) =>
      group.some((definition) => definition.predicate(item)),
    ),
  );
}

/** Toggle a facet id on/off. Empty result means All is active. */
export function toggleFilterId(
  activeIds: readonly string[],
  id: string,
): string[] {
  if (activeIds.includes(id)) {
    return activeIds.filter((activeId) => activeId !== id);
  }
  return [...activeIds, id];
}

/** True when no facet filters are active (All). */
export function isAllActive(activeIds: readonly string[]): boolean {
  return activeIds.length === 0;
}

/**
 * Resolve toolbar click against faceted state.
 * `clearId` (typically `"all"`) clears every facet.
 * Clearing the last facet leaves All active (empty array).
 */
export function resolveFilterSelection(
  activeIds: readonly string[],
  clickedId: string,
  clearId = "all",
): string[] {
  if (clickedId === clearId) return [];
  return toggleFilterId(activeIds, clickedId);
}
