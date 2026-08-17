/**
 * Sticky edge-column contract for OS directory / data tables (BP-028E).
 *
 * - Sticky Name (left) — content width only; does not flex
 * - Sticky Actions (right) — button-cluster width only; does not flex
 * - Middle columns share remaining width between the sticky edges
 *
 * Pair body rows with `stickyColumnRowClass`. Never put overflow-hidden on
 * sticky edge cells.
 */

import {
  DIRECTORY_ACTIONS_WIDTH_CLASS,
  DIRECTORY_NAME_WIDTH_CLASS,
} from "./directoryColumnWidths";

const LEADING_SHADOW = "shadow-[2px_0_6px_-2px_rgba(17,24,39,0.10)]";
const TRAILING_SHADOW = "shadow-[-2px_0_6px_-2px_rgba(17,24,39,0.10)]";

/** @deprecated Prefer DIRECTORY_ACTIONS_WIDTH_CLASS. */
export const STICKY_ACTIONS_COLUMN_WIDTH_CLASS = DIRECTORY_ACTIONS_WIDTH_CLASS;

/** @deprecated Prefer DIRECTORY_NAME_WIDTH_CLASS. */
export const STICKY_NAME_COLUMN_WIDTH_CLASS = DIRECTORY_NAME_WIDTH_CLASS;

/** Row class so sticky cells track hover / selected state. */
export const stickyColumnRowClass = "group/row";

/** @deprecated Use `stickyColumnRowClass`. */
export const stickyLeadingRowClass = stickyColumnRowClass;

const stickyCellHoverSelected = [
  "group-hover/row:bg-app-background",
  "group-aria-[selected=true]/row:bg-app-background",
  "group-data-[selected=true]/row:bg-app-background",
].join(" ");

/** Leading (Name) header cell.
 * Solid background only — no backdrop-filter. Blur promotes a compositor layer
 * that can paint over portaled fixed menus (Recruiting filter dropdowns).
 */
export const stickyLeadingThClass = [
  "sticky left-0 z-30",
  "bg-app-background",
  LEADING_SHADOW,
  DIRECTORY_NAME_WIDTH_CLASS,
].join(" ");

/** Leading (Name) body cell. */
export const stickyLeadingTdClass = [
  "sticky left-0 z-20",
  "bg-surface",
  stickyCellHoverSelected,
  LEADING_SHADOW,
  DIRECTORY_NAME_WIDTH_CLASS,
].join(" ");

/** Trailing (Actions) header cell — solid bg; see stickyLeadingThClass note. */
export const stickyTrailingThClass = [
  "sticky right-0 z-30",
  "bg-app-background",
  "border-l border-border/70",
  TRAILING_SHADOW,
  DIRECTORY_ACTIONS_WIDTH_CLASS,
  "whitespace-nowrap",
].join(" ");

/** Trailing (Actions) body cell. */
export const stickyTrailingTdClass = [
  "sticky right-0 z-20",
  "bg-surface",
  stickyCellHoverSelected,
  "border-l border-border/70",
  TRAILING_SHADOW,
  DIRECTORY_ACTIONS_WIDTH_CLASS,
  "whitespace-nowrap",
].join(" ");
