/**
 * Filter UTR API payloads to a monitoring window for routine automatic checks.
 */
import type { UtrApiEvent, UtrApiMatch, UtrApiResultsPayload } from "./normalizeUtrCapture";

export const UTR_MONITORING_WINDOW_DAYS = 120;
export const UTR_MONITORING_OVERLAP_DAYS = 14;

function parseIsoDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim().slice(0, 10);
  const parsed = Date.parse(`${trimmed}T12:00:00.000Z`);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function matchDates(event: UtrApiEvent, match: UtrApiMatch): Date[] {
  const dates: Date[] = [];
  for (const candidate of [match.date, event.startDate, event.endDate]) {
    const parsed = parseIsoDate(candidate ?? undefined);
    if (parsed) dates.push(parsed);
  }
  return dates;
}

function eventLatestDate(event: UtrApiEvent): Date | null {
  const dates = matchDates(event, {});
  for (const draw of event.draws ?? []) {
    for (const match of draw.results ?? []) {
      dates.push(...matchDates(event, match));
    }
  }
  for (const match of event.results ?? []) {
    dates.push(...matchDates(event, match));
  }
  if (dates.length === 0) return null;
  return dates.reduce((latest, current) => (current > latest ? current : latest));
}

export function monitoringCutoffDate(input: {
  now?: Date;
  windowDays?: number;
}): Date {
  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? UTR_MONITORING_WINDOW_DAYS;
  return new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
}

export function filterUtrResultsPayload(
  payload: UtrApiResultsPayload,
  input: {
    now?: Date;
    windowDays?: number;
  } = {},
): UtrApiResultsPayload {
  const cutoff = monitoringCutoffDate(input);

  const events = (payload.events ?? [])
    .map((event) => {
      const filterMatches = (matches: UtrApiMatch[] | null | undefined) =>
        (matches ?? []).filter((match) => {
          const dates = matchDates(event, match);
          if (dates.length === 0) {
            const eventDate = eventLatestDate(event);
            return eventDate ? eventDate >= cutoff : false;
          }
          return dates.some((date) => date >= cutoff);
        });

      const results = filterMatches(event.results);
      const draws = (event.draws ?? [])
        .map((draw) => ({
          ...draw,
          results: filterMatches(draw.results),
        }))
        .filter((draw) => (draw.results?.length ?? 0) > 0);

      return {
        ...event,
        results,
        draws,
      };
    })
    .filter((event) => {
      const hasResults = (event.results?.length ?? 0) > 0;
      const hasDrawResults = (event.draws ?? []).some((draw) => (draw.results?.length ?? 0) > 0);
      return hasResults || hasDrawResults;
    });

  return {
    ...payload,
    events,
  };
}

export function countUtrPayloadMatches(payload: UtrApiResultsPayload): number {
  let count = 0;
  for (const event of payload.events ?? []) {
    count += event.results?.length ?? 0;
    for (const draw of event.draws ?? []) {
      count += draw.results?.length ?? 0;
    }
  }
  return count;
}
