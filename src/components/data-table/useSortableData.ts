"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { getNextSortState, sortItems } from "./sorting";
import type { ColumnDef, SortState } from "./types";

export type UseSortableDataOptions<Key extends string> = {
  /**
   * Restored after hydration (e.g. sessionStorage). Server render and the
   * hydration pass always use the table's natural/default order (`null`).
   * Return `null` when nothing is stored.
   */
  getInitialSort?: () => SortState<Key>;
  /** Fired whenever the user advances the sort cycle via a header click. */
  onSortChange?: (sort: SortState<Key>) => void;
};

const UNSET = Symbol("useSortableData.unset");

function subscribeHydration() {
  return () => {};
}

function getClientHydrated() {
  return true;
}

function getServerHydrated() {
  return false;
}

/**
 * Reusable table-sorting behavior. Owns the active `SortState` and derives
 * the sorted list from whatever `items` (already filtered/searched by the
 * caller) and `columns` are passed in.
 *
 * Intended to be used by any module's table — pass the rows and column
 * definitions for that table, get back the sorted rows plus everything
 * needed to render sort indicators and wire up header clicks.
 */
export function useSortableData<T, Key extends string>(
  items: T[],
  columns: ColumnDef<T, Key>[],
  options?: UseSortableDataOptions<Key>,
) {
  const getInitialSort = options?.getInitialSort;
  const onSortChange = options?.onSortChange;
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getClientHydrated,
    getServerHydrated,
  );
  const [sort, setSort] = useState<SortState<Key> | typeof UNSET>(UNSET);

  const activeSort: SortState<Key> = !hydrated
    ? null
    : sort === UNSET
      ? (getInitialSort?.() ?? null)
      : sort;

  const sortedItems = useMemo(
    () => sortItems(items, activeSort, columns),
    [items, columns, activeSort],
  );

  function toggleSort(columnId: Key) {
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column) return;

    const current = sort === UNSET ? (getInitialSort?.() ?? null) : sort;
    const next = getNextSortState(current, column);
    setSort(next);
    onSortChange?.(next);
  }

  return { sortedItems, sort: activeSort, toggleSort };
}
