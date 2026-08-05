import { EMPTY_VALUE } from "./constants";
import { isEmptyDisplayValue } from "./empty";

function asFiniteNumber(value: number | string | null | undefined): number | undefined {
  if (isEmptyDisplayValue(value)) return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** UTR — always 2 decimal places (e.g. 11.63, 8.90, 6.00). */
export function formatUtr(value: number | string | null | undefined): string {
  const n = asFiniteNumber(value);
  return n === undefined ? EMPTY_VALUE : n.toFixed(2);
}

/** WTN — always 2 decimal places. */
export function formatWtn(value: number | string | null | undefined): string {
  const n = asFiniteNumber(value);
  return n === undefined ? EMPTY_VALUE : n.toFixed(2);
}

/** GPA — always 2 decimal places (e.g. 3.57, 4.00). */
export function formatGpa(value: number | string | null | undefined): string {
  const n = asFiniteNumber(value);
  return n === undefined ? EMPTY_VALUE : n.toFixed(2);
}

/**
 * Percentage — 1 decimal place with `%` (e.g. 78.4%, 63.0%).
 * Pass the percentage number (78.4), not a 0–1 fraction.
 */
export function formatPercent(value: number | string | null | undefined): string {
  const n = asFiniteNumber(value);
  return n === undefined ? EMPTY_VALUE : `${n.toFixed(1)}%`;
}
