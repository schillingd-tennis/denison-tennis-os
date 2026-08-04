/**
 * Universal DataTable sorting types (BP-009).
 *
 * Table-agnostic and parameterized by row type `T` and a string-literal
 * column id `Key`, so any module's table — Team, Recruiting, Operations,
 * Research Lab, Knowledge, Equipment, Camps, etc. — can define its own
 * columns without duplicating the sorting engine itself.
 *
 * The key idea: a column declares WHAT KIND of data it holds (`sortType`),
 * and the engine (see `sorting.ts`) knows HOW to compare that kind of data
 * correctly — it never guesses or falls back to naive string comparison.
 */

export type SortDirection = "asc" | "desc";

/** `null` means "no active sort" — i.e. the table's original, default order. */
export type SortState<Key extends string> = {
  key: Key;
  direction: SortDirection;
} | null;

export type SortType = "text" | "number" | "date" | "enum" | "custom";

export type ColumnDef<T, Key extends string = string> = {
  /** Stable column identifier, used as the sort key. */
  id: Key;
  /** Header label shown to the user. */
  title: string;
  /** Right-aligns the header/cells — useful for numeric columns. */
  align?: "left" | "right";
  /** Omit (or leave false) for columns that should never be sortable (e.g. an action column). */
  sortable?: boolean;
  /**
   * Extracts the raw, comparable value for this column from a row (e.g.
   * `(person) => person.utr`). Required for every `sortType` except
   * `"custom"`, where a full `comparator` is supplied instead.
   */
  accessor?: (row: T) => unknown;
  /**
   * Declares how this column's values should be compared. The engine
   * derives a correct comparator from this automatically (see
   * `buildColumnComparator` in `sorting.ts`) — you only need to supply your
   * own `comparator` when `sortType` is `"custom"`.
   */
  sortType?: SortType;
  /**
   * Explicit value ordering, required when `sortType` is `"enum"` (e.g.
   * `["current", "alumni"]`). Values are compared by their index in this
   * array — never alphabetically. Values not present in the list are
   * treated the same as a blank value (sorted last).
   */
  enumOrder?: string[];
  /**
   * Full comparator, required when `sortType` is `"custom"`. Should return
   * a normal ascending-style comparison (negative/zero/positive); the
   * engine still applies ascending/descending direction on top of it.
   */
  comparator?: (a: T, b: T) => number;
  /**
   * Direction used the first time this column is activated (i.e. what
   * "click once" produces). Defaults to `"asc"` when omitted. A second
   * click flips to the opposite direction; a third click clears the sort.
   */
  defaultSort?: SortDirection;
};
