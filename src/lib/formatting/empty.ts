import { EMPTY_VALUE } from "./constants";

/** True when a value should render as the empty glyph. */
export function isEmptyDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/**
 * Presentation helper for text-like fields.
 * Never returns null / undefined / NaN / blank — uses `EMPTY_VALUE`.
 */
export function formatDisplay(value: string | number | null | undefined): string {
  if (isEmptyDisplayValue(value)) return EMPTY_VALUE;
  return String(value).trim();
}
