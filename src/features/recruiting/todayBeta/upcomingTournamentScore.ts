/**
 * Upcoming tournament contact opportunities (Today Beta v0.1).
 */
import { calendarDaysBetween } from "@/features/interactions/contactSummary";
import type { LookupRef } from "@/features/lookups/types";

import { PRIORITY_A_KEYS, PRIORITY_B_KEYS } from "./contactOpportunityConfig";
import {
  UPCOMING_TOURNAMENT_DAYS_TIERS,
  UPCOMING_TOURNAMENT_MAX_SCORE,
  UPCOMING_TOURNAMENT_PRIORITY_BONUS,
} from "./upcomingTournamentConfig";
import type { ContactOpportunityScoreFactor } from "./contactOpportunityScore";
import type { RecruitUpcomingTournament } from "./types";

export type TournamentOpportunity = {
  tournamentScore: number;
  upcomingTournament: RecruitUpcomingTournament;
  daysUntilStart: number;
  factors: ContactOpportunityScoreFactor[];
};

function localDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function parseIsoDate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return new Date(value);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function daysUntilTournamentStart(startDate: string, now: Date = new Date()): number {
  return calendarDaysBetween(localDay(now), parseIsoDate(startDate));
}

export function isTournamentExpired(
  tournament: Pick<RecruitUpcomingTournament, "startDate" | "endDate" | "status">,
  now: Date = new Date(),
): boolean {
  if (tournament.status === "CANCELLED" || tournament.status === "COMPLETED") {
    return true;
  }
  const effectiveEnd = tournament.endDate ?? tournament.startDate;
  return calendarDaysBetween(parseIsoDate(effectiveEnd), localDay(now)) > 0;
}

function baseScoreForDaysUntilStart(daysUntilStart: number): number {
  for (const tier of UPCOMING_TOURNAMENT_DAYS_TIERS) {
    if ("daysUntilStart" in tier && tier.daysUntilStart === daysUntilStart) {
      return tier.score;
    }
    if (
      "minDaysUntilStart" in tier &&
      daysUntilStart >= tier.minDaysUntilStart &&
      daysUntilStart <= tier.maxDaysUntilStart
    ) {
      return tier.score;
    }
  }
  return 0;
}

function priorityBonus(priority?: LookupRef): ContactOpportunityScoreFactor | null {
  const key = priority?.key;
  if (!key) return null;

  if (PRIORITY_A_KEYS.has(key)) {
    return {
      key: "tournament_priority_a",
      points: UPCOMING_TOURNAMENT_PRIORITY_BONUS.priorityA,
      reason: "Priority A recruit",
    };
  }
  if (PRIORITY_B_KEYS.has(key)) {
    return {
      key: "tournament_priority_b",
      points: UPCOMING_TOURNAMENT_PRIORITY_BONUS.priorityB,
      reason: "Priority B recruit",
    };
  }
  return null;
}

function tournamentReason(daysUntilStart: number, tournamentName: string): string {
  if (daysUntilStart === 0) {
    return `Tournament starts today (${tournamentName})`;
  }
  if (daysUntilStart === 1) {
    return `Tournament starts tomorrow (${tournamentName})`;
  }
  return `Tournament starts in ${daysUntilStart} days (${tournamentName})`;
}

export function scoreTournamentOpportunity(input: {
  tournament: RecruitUpcomingTournament;
  priority?: LookupRef;
  now?: Date;
}): TournamentOpportunity | null {
  const now = input.now ?? new Date();
  if (isTournamentExpired(input.tournament, now)) {
    return null;
  }

  const daysUntilStart = daysUntilTournamentStart(input.tournament.startDate, now);
  if (daysUntilStart < 0) {
    return null;
  }

  const baseScore = baseScoreForDaysUntilStart(daysUntilStart);
  if (baseScore === 0) {
    return null;
  }

  const factors: ContactOpportunityScoreFactor[] = [
    {
      key: "upcoming_tournament",
      points: baseScore,
      reason: tournamentReason(daysUntilStart, input.tournament.tournamentName),
    },
  ];

  const bonus = priorityBonus(input.priority);
  if (bonus) {
    factors.push(bonus);
  }

  const rawScore = factors.reduce((total, factor) => total + factor.points, 0);
  const tournamentScore = Math.min(rawScore, UPCOMING_TOURNAMENT_MAX_SCORE);

  return {
    tournamentScore,
    upcomingTournament: input.tournament,
    daysUntilStart,
    factors,
  };
}

export function selectNearestTournamentOpportunity(input: {
  tournaments: readonly RecruitUpcomingTournament[];
  priority?: LookupRef;
  now?: Date;
}): TournamentOpportunity | null {
  let best: TournamentOpportunity | null = null;

  for (const tournament of input.tournaments) {
    const scored = scoreTournamentOpportunity({
      tournament,
      priority: input.priority,
      now: input.now,
    });
    if (!scored) continue;

    if (
      !best ||
      scored.daysUntilStart < best.daysUntilStart ||
      (scored.daysUntilStart === best.daysUntilStart &&
        scored.tournamentScore > best.tournamentScore)
    ) {
      best = scored;
    }
  }

  return best;
}
