import { occurredInRange, rangeForCalendarMonth, rangeForPeriod } from "./period";
import type { ChangeLogEvent } from "./types";

export function recruitCardChangeLogSummaries(events: readonly ChangeLogEvent[], now = new Date()) {
  const month = rangeForCalendarMonth(now);
  const thisMonth = events.filter((event) => occurredInRange(event.occurredAt, month));
  return {
    updatesThisMonth: thisMonth.length,
    rankingChanges: thisMonth.filter((event) => event.category === "rankings").length,
    recruitingChanges: thisMonth.filter((event) => event.category === "recruiting").length,
  };
}

export function centralChangeLogSummaries(events: readonly ChangeLogEvent[], now = new Date()) {
  const today = rangeForPeriod("today", now);
  const week = rangeForPeriod("past_week", now);
  return {
    updatesToday: events.filter((event) => occurredInRange(event.occurredAt, today)).length,
    updatesThisWeek: events.filter((event) => occurredInRange(event.occurredAt, week)).length,
    rankingChanges: events.filter((event) => event.category === "rankings").length,
    recruitingChanges: events.filter((event) => event.category === "recruiting").length,
  };
}

export function dashboardRecentChangeLogs(events: readonly ChangeLogEvent[], limit = 5): ChangeLogEvent[] {
  return [...events]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
    .slice(0, limit);
}
