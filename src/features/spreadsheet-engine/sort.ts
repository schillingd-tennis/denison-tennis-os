/**
 * Spreadsheet sort architecture (BP-038A).
 *
 * Single- and multi-column sort specs. No UI / no row comparator wiring here —
 * future grid and repository layers consume `SpreadsheetSort[]`.
 */

import { getPersonColumnDefinition } from "./columnFromCatalog";
import type { SavedView, SpreadsheetSort } from "./types";

/** Normalize sorts: drop unknown / non-sortable catalog fields; keep order. */
export function normalizeSorts(sorts: readonly SpreadsheetSort[] | undefined): SpreadsheetSort[] {
  if (!sorts?.length) return [];
  const normalized: SpreadsheetSort[] = [];
  for (const sort of sorts) {
    const column = getPersonColumnDefinition(sort.fieldId);
    if (!column?.sortable) continue;
    if (sort.direction !== "asc" && sort.direction !== "desc") continue;
    normalized.push({ fieldId: sort.fieldId, direction: sort.direction });
  }
  return normalized;
}

/** Primary sort from a SavedView (first entry), if any. */
export function primarySort(view: SavedView): SpreadsheetSort | undefined {
  return normalizeSorts(view.sorts)[0];
}

/** Whether the view uses multi-column sorting. */
export function isMultiColumnSort(view: SavedView): boolean {
  return normalizeSorts(view.sorts).length > 1;
}
