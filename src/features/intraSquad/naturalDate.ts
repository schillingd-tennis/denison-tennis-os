import { isIsoCalendarDate, todayLocalIsoDate } from "./dates";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function toIso(year: number, monthIndex: number, day: number): string | null {
  const date = new Date(year, monthIndex, day);
  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
    return null;
  }
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${month}-${dayText}`;
}

function shiftDays(now: Date, days: number): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return todayLocalIsoDate(date);
}

function mostRecentWeekday(now: Date, weekday: number): string {
  const current = now.getDay();
  let delta = current - weekday;
  if (delta < 0) delta += 7;
  if (delta === 0) return todayLocalIsoDate(now);
  return shiftDays(now, -delta);
}

function lastWeekday(now: Date, weekday: number): string {
  const current = now.getDay();
  let delta = current - weekday;
  if (delta <= 0) delta += 7;
  return shiftDays(now, -delta);
}

export type NaturalDateExtraction = {
  dateIso: string | null;
  dateText: string | null;
  remainder: string;
};

/**
 * Pulls coach-style date phrases out of match text.
 * Returns ISO YYYY-MM-DD when resolved against local calendar.
 */
export function extractNaturalDate(raw: string, now: Date = new Date()): NaturalDateExtraction {
  let remainder = raw.trim().replace(/\s+/g, " ");
  let dateIso: string | null = null;
  let dateText: string | null = null;

  const tryMatch = (pattern: RegExp, resolve: (match: RegExpExecArray) => string | null) => {
    if (dateIso) return;
    const match = pattern.exec(remainder);
    if (!match) return;
    const resolved = resolve(match);
    if (!resolved || !isIsoCalendarDate(resolved)) return;
    dateIso = resolved;
    dateText = match[0]!.trim();
    remainder = `${remainder.slice(0, match.index)} ${remainder.slice(match.index + match[0]!.length)}`
      .replace(/\s+/g, " ")
      .trim();
  };

  tryMatch(/\byesterday\b/i, () => shiftDays(now, -1));
  tryMatch(/\btoday\b/i, () => todayLocalIsoDate(now));
  tryMatch(/\btomorrow\b/i, () => shiftDays(now, 1));

  tryMatch(
    /\blast\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
    (match) => lastWeekday(now, WEEKDAYS.indexOf(match[1]!.toLowerCase() as (typeof WEEKDAYS)[number])),
  );

  tryMatch(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
    (match) => mostRecentWeekday(now, WEEKDAYS.indexOf(match[1]!.toLowerCase() as (typeof WEEKDAYS)[number])),
  );

  tryMatch(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?\b/i,
    (match) => {
      const monthKey = match[1]!.toLowerCase().replace(/\./g, "");
      const monthIndex = MONTHS[monthKey];
      if (monthIndex == null) return null;
      const day = Number(match[2]);
      const year = match[3] ? Number(match[3]) : now.getFullYear();
      return toIso(year, monthIndex, day);
    },
  );

  tryMatch(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (match) => {
    const monthIndex = Number(match[1]) - 1;
    const day = Number(match[2]);
    let year = match[3] ? Number(match[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    return toIso(year, monthIndex, day);
  });

  tryMatch(/\b(\d{4})-(\d{2})-(\d{2})\b/, (match) => match[0]!);

  return { dateIso, dateText, remainder };
}
