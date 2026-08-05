"use client";

import { useMemo, useState } from "react";

import { getNextSortState, sortItems } from "./sorting";
import type { ColumnDef, SortState } from "./types";

export type UseSortableDataOptions<Key extends string> = {
  /**
   * Lazy initial sort (e.g. restored from sessionStorage). Runs once on
   * mount — return `null` for the table's natural/default order.
   */
  getInitialSort?: () => SortState<Key>;
  /** Fired whenever the user advances the sort cycle via a header click. */
  onSortChange?: (sort: SortState<Key>) => void;
};

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
  const [sort, setSort] = useState<SortState<Key>>(
    () => options?.getInitialSort?.() ?? null,
  );

  const sortedItems = useMemo(
    () => sortItems(items, sort, columns),
    [items, sort, columns],
  );

  function toggleSort(columnId: Key) {
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column) return;

    setSort((current) => {
      const next = getNextSortState(current, column);
      options?.onSortChange?.(next);
      return next;
    });
  }

  return { sortedItems, sort, toggleSort };
}
