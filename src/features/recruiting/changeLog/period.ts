import {
  DEFAULT_INTERACTION_PERIOD,
  INTERACTION_PERIODS,
  INTERACTIONS_TIME_ZONE,
  type InteractionPeriod,
  addCivilDays,
  civilDateInZone,
  parseInteractionPeriod,
  rangeForPeriod,
  type UtcRange,
  zonedCivilTimeToUtc,
} from "@/features/interactions/centralPeriod";

export const CHANGE_LOG_TIME_ZONE = INTERACTIONS_TIME_ZONE;
export const CHANGE_LOG_PERIODS = INTERACTION_PERIODS;
export type ChangeLogPeriod = InteractionPeriod;
export const DEFAULT_CHANGE_LOG_PERIOD: ChangeLogPeriod = DEFAULT_INTERACTION_PERIOD;

export const parseChangeLogPeriod = parseInteractionPeriod;
export { rangeForPeriod };

export function rangeForCalendarMonth(
  now: Date = new Date(),
  timeZone = CHANGE_LOG_TIME_ZONE,
): UtcRange {
  const today = civilDateInZone(now, timeZone);
  return {
    startMs: zonedCivilTimeToUtc({ year: today.year, month: today.month, day: 1 }, 0, 0, 0, timeZone).getTime(),
    endMs: now.getTime(),
  };
}

export function occurredInRange(occurredAt: string, range: UtcRange, exclusiveEnd = false): boolean {
  const ms = Date.parse(occurredAt);
  if (Number.isNaN(ms)) return false;
  if (range.startMs != null && ms < range.startMs) return false;
  if (range.endMs == null) return true;
  return exclusiveEnd ? ms < range.endMs : ms <= range.endMs;
}

export { addCivilDays, civilDateInZone, zonedCivilTimeToUtc };
export type { UtcRange };
