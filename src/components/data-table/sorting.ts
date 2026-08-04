import type { ColumnDef, SortDirection, SortState } from "./types";

/**
 * Advances a column through its three-state cycle:
 * unsorted -> [column's defaultSort direction] -> [opposite direction] -> unsorted.
 *
 * Most columns default to ascending on their first click, but a column may
 * declare `defaultSort: "desc"` (e.g. UTR — highest first is usually more
 * useful) to change what "click once" means for it. Clicking a different
 * column always restarts that column's own cycle — only one column is ever
 * actively sorted at a time.
 */
export function getNextSortState<T, Key extends string>(
  current: SortState<Key>,
  column: ColumnDef<T, Key>,
): SortState<Key> {
  const initialDirection: SortDirection = column.defaultSort ?? "asc";

  if (!current || current.key !== column.id) {
    return { key: column.id, direction: initialDirection };
  }
  if (current.direction === initialDirection) {
    return { key: column.id, direction: initialDirection === "asc" ? "desc" : "asc" };
  }
  return null;
}

/** Treated as "no value" for sorting purposes — always sorts last, in either direction. */
function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).getTime();
  }
  return NaN;
}

/**
 * Builds a comparator for one column, in the requested direction, that:
 *
 * 1. Always sorts blank values last, regardless of ascending/descending
 *    (per-value sign flipping rather than reversing the whole sorted
 *    array — reversing would incorrectly move blanks to the front on
 *    descending sorts).
 * 2. Compares non-blank values using the strategy for the column's
 *    declared `sortType` — never a naive/guessed string comparison.
 */
export function buildColumnComparator<T, Key extends string>(
  column: ColumnDef<T, Key>,
  direction: SortDirection,
): (a: T, b: T) => number {
  const sign = direction === "asc" ? 1 : -1;

  if (column.sortType === "custom") {
    if (!column.comparator) {
      throw new Error(`Column "${column.id}" declares sortType "custom" but has no comparator.`);
    }
    const custom = column.comparator;
    return (a, b) => sign * custom(a, b);
  }

  const accessor = column.accessor ?? (() => undefined);

  return (a, b) => {
    const rawA = accessor(a);
    const rawB = accessor(b);
    const blankA = isBlank(rawA);
    const blankB = isBlank(rawB);

    if (blankA && blankB) return 0;
    if (blankA) return 1;
    if (blankB) return -1;

    switch (column.sortType) {
      case "number":
        return sign * ((rawA as number) - (rawB as number));

      case "date":
        return sign * (toTimestamp(rawA) - toTimestamp(rawB));

      case "enum": {
        const order = column.enumOrder ?? [];
        const indexA = order.indexOf(String(rawA));
        const indexB = order.indexOf(String(rawB));
        const rankA = indexA === -1 ? order.length : indexA;
        const rankB = indexB === -1 ? order.length : indexB;
        return sign * (rankA - rankB);
      }

      case "text":
      default:
        return sign * normalizeText(rawA).localeCompare(normalizeText(rawB));
    }
  };
}

/**
 * Applies a `SortState` to a list of items (already filtered/searched by
 * the caller). Returns the items in their original, untouched order when
 * there is no active sort — this is the table's "default order."
 */
export function sortItems<T, Key extends string>(
  items: T[],
  sort: SortState<Key>,
  columns: ColumnDef<T, Key>[],
): T[] {
  if (!sort) return items;

  const column = columns.find((candidate) => candidate.id === sort.key);
  if (!column) return items;

  const comparator = buildColumnComparator(column, sort.direction);
  return [...items].sort(comparator);
}
