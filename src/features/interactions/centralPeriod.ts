/** America/New_York date windows for the central Interactions page. */

export const INTERACTIONS_TIME_ZONE = "America/New_York";

export const INTERACTION_PERIODS = ["all", "today", "yesterday", "past_week", "past_month"] as const;
export type InteractionPeriod = (typeof INTERACTION_PERIODS)[number];
export const DEFAULT_INTERACTION_PERIOD: InteractionPeriod = "past_month";

export const INTERACTION_KIND_FILTERS = ["all", "texts", "calls", "emails", "visits"] as const;
export type InteractionKindFilter = (typeof INTERACTION_KIND_FILTERS)[number];

export type CivilDate = { year: number; month: number; day: number };

export type UtcRange = {
  startMs: number | null;
  endMs: number | null;
};

function partNumber(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value);
}

export function civilDateInZone(instant: Date, timeZone = INTERACTIONS_TIME_ZONE): CivilDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  return {
    year: partNumber(parts, "year"),
    month: partNumber(parts, "month"),
    day: partNumber(parts, "day"),
  };
}

export function addCivilDays(date: CivilDate, days: number): CivilDate {
  const utc = Date.UTC(date.year, date.month - 1, date.day + days);
  const shifted = new Date(utc);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function calendarDaysBetweenCivil(from: CivilDate, to: CivilDate): number {
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((b - a) / 86_400_000);
}

function wallClockAsUtcMs(date: CivilDate, hour: number, minute: number, second: number): number {
  return Date.UTC(date.year, date.month - 1, date.day, hour, minute, second);
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  return {
    year: partNumber(parts, "year"),
    month: partNumber(parts, "month"),
    day: partNumber(parts, "day"),
    hour: partNumber(parts, "hour"),
    minute: partNumber(parts, "minute"),
    second: partNumber(parts, "second"),
  };
}

/** Convert a civil wall time in `timeZone` to a UTC Date. DST-safe. */
export function zonedCivilTimeToUtc(
  date: CivilDate,
  hour = 0,
  minute = 0,
  second = 0,
  timeZone = INTERACTIONS_TIME_ZONE,
): Date {
  const desired = wallClockAsUtcMs(date, hour, minute, second);
  let instant = desired;
  for (let i = 0; i < 4; i += 1) {
    const local = zonedParts(new Date(instant), timeZone);
    const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    instant = desired - (asUtc - instant);
  }
  return new Date(instant);
}

export function parseInteractionPeriod(raw: string | null | undefined): InteractionPeriod {
  if (raw && (INTERACTION_PERIODS as readonly string[]).includes(raw)) {
    return raw as InteractionPeriod;
  }
  return DEFAULT_INTERACTION_PERIOD;
}

export function parseInteractionKind(raw: string | null | undefined): InteractionKindFilter {
  if (raw && (INTERACTION_KIND_FILTERS as readonly string[]).includes(raw)) {
    return raw as InteractionKindFilter;
  }
  return "all";
}

export function rangeForPeriod(
  period: InteractionPeriod,
  now: Date = new Date(),
  timeZone = INTERACTIONS_TIME_ZONE,
): UtcRange {
  if (period === "all") return { startMs: null, endMs: null };
  const today = civilDateInZone(now, timeZone);
  const todayStart = zonedCivilTimeToUtc(today, 0, 0, 0, timeZone).getTime();
  if (period === "today") return { startMs: todayStart, endMs: now.getTime() };
  if (period === "yesterday") {
    const yesterday = addCivilDays(today, -1);
    return {
      startMs: zonedCivilTimeToUtc(yesterday, 0, 0, 0, timeZone).getTime(),
      endMs: todayStart,
    };
  }
  if (period === "past_week") {
    return {
      startMs: zonedCivilTimeToUtc(addCivilDays(today, -6), 0, 0, 0, timeZone).getTime(),
      endMs: now.getTime(),
    };
  }
  return {
    startMs: zonedCivilTimeToUtc(addCivilDays(today, -29), 0, 0, 0, timeZone).getTime(),
    endMs: now.getTime(),
  };
}

export function occurredInUtcRange(occurredAt: string, range: UtcRange, exclusiveEnd = false): boolean {
  const ms = Date.parse(occurredAt);
  if (Number.isNaN(ms)) return false;
  if (range.startMs != null && ms < range.startMs) return false;
  if (range.endMs == null) return true;
  return exclusiveEnd ? ms < range.endMs : ms <= range.endMs;
}

export function matchesPeriod(occurredAt: string, period: InteractionPeriod, now: Date): boolean {
  const range = rangeForPeriod(period, now);
  const exclusiveEnd = period === "yesterday";
  return occurredInUtcRange(occurredAt, range, exclusiveEnd);
}

export function interactionsPageHref(options: {
  period: InteractionPeriod;
  kind: InteractionKindFilter;
  query: string;
}): string {
  const params = new URLSearchParams();
  if (options.period !== DEFAULT_INTERACTION_PERIOD) params.set("period", options.period);
  if (options.kind !== "all") params.set("kind", options.kind);
  const query = options.query.trim();
  if (query) params.set("q", query);
  const suffix = params.toString();
  return suffix ? `/recruiting/interactions?${suffix}` : "/recruiting/interactions";
}
