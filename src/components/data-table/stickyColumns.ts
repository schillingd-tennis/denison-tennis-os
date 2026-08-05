/**
 * Sticky edge-column contract for OS directory / data tables (BP-025D / BP-028A).
 *
 * Standard layout for large tables:
 * - Sticky first column (Name / identity) on the left
 * - Sticky Actions column on the right
 * - Middle columns scroll horizontally between them
 *
 * Apply these classes to the edge `<th>` / `<td>` cells. Pair body rows with
 * `stickyColumnRowClass` (`group/row`) so hover / selected backgrounds stay
 * aligned on sticky cells. Do not copy ad-hoc sticky CSS into feature tables.
 */

const LEADING_SHADOW = "shadow-[2px_0_6px_-2px_rgba(17,24,39,0.10)]";
const TRAILING_SHADOW = "shadow-[-2px_0_6px_-2px_rgba(17,24,39,0.10)]";

/**
 * Fixed Actions column width — fits Phone + Message + Email icon buttons
 * (3 × 40px + gaps + cell padding) without clip, wrap, or shrink.
 */
export const STICKY_ACTIONS_COLUMN_WIDTH_CLASS = "w-[10.5rem] min-w-[10.5rem] max-w-[10.5rem]";

/** Row class so sticky cells track hover / selected state. */
export const stickyColumnRowClass = "group/row";

/** @deprecated Use `stickyColumnRowClass`. */
export const stickyLeadingRowClass = stickyColumnRowClass;

const stickyCellHoverSelected = [
  "group-hover/row:bg-app-background",
  "group-aria-[selected=true]/row:bg-app-background",
  "group-data-[selected=true]/row:bg-app-background",
].join(" ");

/** Leading (Name) header cell. */
export const stickyLeadingThClass = [
  "sticky left-0 z-30",
  "bg-app-background/95 backdrop-blur-[2px]",
  LEADING_SHADOW,
].join(" ");

/** Leading (Name) body cell. */
export const stickyLeadingTdClass = [
  "sticky left-0 z-20",
  "bg-surface",
  stickyCellHoverSelected,
  LEADING_SHADOW,
].join(" ");

/** Trailing (Actions) header cell. */
export const stickyTrailingThClass = [
  "sticky right-0 z-30",
  "bg-app-background/95 backdrop-blur-[2px]",
  "border-l border-border/70",
  TRAILING_SHADOW,
  STICKY_ACTIONS_COLUMN_WIDTH_CLASS,
  "whitespace-nowrap",
].join(" ");

/** Trailing (Actions) body cell. */
export const stickyTrailingTdClass = [
  "sticky right-0 z-20",
  "bg-surface",
  stickyCellHoverSelected,
  "border-l border-border/70",
  TRAILING_SHADOW,
  STICKY_ACTIONS_COLUMN_WIDTH_CLASS,
  "whitespace-nowrap",
].join(" ");
