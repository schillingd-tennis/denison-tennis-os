/**
 * TRN tournament date detection and normalization (Today Beta).
 * Never uses Date.parse() on raw TRN date strings.
 */

const MONTH_NUMBERS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const SINGLE_DATE_LINE = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/;
const SAME_MONTH_RANGE_LINE = /^([A-Za-z]+)\s+(\d{1,2})-(\d{1,2}),\s+(\d{4})$/;
const CROSS_MONTH_RANGE_LINE = /^([A-Za-z]+)\s+(\d{1,2})-([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/;

function monthNumber(name: string): number | null {
  return MONTH_NUMBERS[name.trim().toLowerCase()] ?? null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** True when a line matches known TRN tournament date shapes (strict). */
export function isTournamentDateLine(line: string): boolean {
  const trimmed = line.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  return (
    SINGLE_DATE_LINE.test(trimmed) ||
    SAME_MONTH_RANGE_LINE.test(trimmed) ||
    CROSS_MONTH_RANGE_LINE.test(trimmed)
  );
}

/**
 * Normalize TRN tournament date text to ISO start date (YYYY-MM-DD).
 * Returns null when the text is unrecognized or not confidently parseable.
 */
export function normalizeTrnTournamentDate(raw: string | undefined | null): string | null {
  if (!raw || raw.trim() === "" || raw.trim().toUpperCase() === "UNKNOWN") return null;

  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const single = trimmed.match(SINGLE_DATE_LINE);
  if (single) {
    const month = monthNumber(single[1]!);
    if (!month) return null;
    return toIsoDate(Number(single[3]), month, Number(single[2]));
  }

  const sameMonthRange = trimmed.match(SAME_MONTH_RANGE_LINE);
  if (sameMonthRange) {
    const month = monthNumber(sameMonthRange[1]!);
    if (!month) return null;
    return toIsoDate(Number(sameMonthRange[4]), month, Number(sameMonthRange[2]));
  }

  const crossMonthRange = trimmed.match(CROSS_MONTH_RANGE_LINE);
  if (crossMonthRange) {
    const month = monthNumber(crossMonthRange[1]!);
    if (!month) return null;
    return toIsoDate(Number(crossMonthRange[5]), month, Number(crossMonthRange[2]));
  }

  return null;
}
