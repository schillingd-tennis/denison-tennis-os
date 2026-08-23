import type { Tournament, TournamentKpis } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const UPCOMING_WINDOW_DAYS = 90;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function isUpcomingWithinDays(tournament: Tournament, days = UPCOMING_WINDOW_DAYS, now = startOfTodayUtc()): boolean {
  const start = parseIsoDate(tournament.startDate);
  if (!start) return false;
  const horizon = new Date(now.getTime() + days * MS_PER_DAY);
  return start >= now && start <= horizon;
}

export function computeTournamentKpis(tournaments: readonly Tournament[]): TournamentKpis {
  const linkedIds = new Set<string>();
  let travelingTo = 0;
  let watching = 0;
  let upcoming = 0;

  for (const tournament of tournaments) {
    if (tournament.recruitingPlan === "traveling") travelingTo += 1;
    if (tournament.recruitingPlan === "watching" || tournament.recruitingPlan === "considering") {
      watching += 1;
    }
    if (isUpcomingWithinDays(tournament)) upcoming += 1;
    for (const recruit of tournament.linkedRecruits) {
      linkedIds.add(recruit.personId);
    }
  }

  return {
    travelingTo,
    watching,
    upcoming,
    linkedRecruits: linkedIds.size,
  };
}
