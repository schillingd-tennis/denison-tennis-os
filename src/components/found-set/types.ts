/**
 * Universal Found Set types (BP-021).
 *
 * Module-agnostic so Team, Recruiting, Operations, and future tables can
 * copy / export whatever rows the user currently has in view — after
 * search, filters, and sort — without re-implementing serialization.
 */

/** A visible column in the current found set (header + value extractor). */
export type FoundSetColumn<T> = {
  id: string;
  title: string;
  /** Returns the display/export value for this column on a row. */
  accessor: (row: T) => string | number | boolean | null | undefined;
};

/**
 * Serialized found-set matrix persisted for cross-route use (e.g. Team List
 * → Player Workspace). Accessors are resolved at publish time so consumers
 * never need the original row objects.
 */
export type FoundSetSnapshot = {
  /** Stable module key (e.g. `"team"`) — used as the sessionStorage namespace. */
  moduleKey: string;
  /** Filename stem without extension (e.g. `"Team"` → `Team-2026-08-05.csv`). */
  filenameBase: string;
  headers: string[];
  /** Cell values already stringified for copy / export. */
  rows: string[][];
  updatedAt: string;
};
