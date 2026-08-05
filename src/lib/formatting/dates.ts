import { EMPTY_VALUE } from "./constants";
import { isEmptyDisplayValue } from "./empty";

/**
 * Parse a date for display. `YYYY-MM-DD` is treated as a local calendar date
 * so timezone offsets cannot shift the day.
 */
export function parseDisplayDate(value: string | Date): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) {
    const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Shared app date display: `Aug 5, 2026`. */
export function formatDate(value: string | Date | null | undefined): string {
  if (isEmptyDisplayValue(value)) return EMPTY_VALUE;
  const date = parseDisplayDate(value as string | Date);
  if (!date) return EMPTY_VALUE;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Shared app time display: `3:30 PM`. */
export function formatTime(value: string | Date | null | undefined): string {
  if (isEmptyDisplayValue(value)) return EMPTY_VALUE;
  const date = parseDisplayDate(value as string | Date);
  if (!date) return EMPTY_VALUE;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
