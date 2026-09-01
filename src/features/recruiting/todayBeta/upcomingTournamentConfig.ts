/**
 * Upcoming tournament scoring and display config (Today Beta v0.1).
 */
import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";

export const UPCOMING_TOURNAMENT_CONTACT_TODAY_MIN_SCORE = 50;

/** Days ahead to show in the Upcoming Tournaments section. */
export const UPCOMING_TOURNAMENT_DISPLAY_WINDOW_DAYS = 14;

/** Days until start when tournament suggested text is offered (0–3). */
export const UPCOMING_TOURNAMENT_SUGGESTED_TEXT_MAX_DAYS = 3;

export const UPCOMING_TOURNAMENT_MAX_SCORE = 100;

/** Base score by days until tournament start. */
export const UPCOMING_TOURNAMENT_DAYS_TIERS = [
  { daysUntilStart: 0, score: 80 },
  { daysUntilStart: 1, score: 75 },
  { daysUntilStart: 2, score: 65 },
  { daysUntilStart: 3, score: 55 },
  { minDaysUntilStart: 4, maxDaysUntilStart: 7, score: 40 },
  { minDaysUntilStart: 8, maxDaysUntilStart: 14, score: 20 },
] as const;

export const UPCOMING_TOURNAMENT_PRIORITY_BONUS = {
  priorityA: 10,
  priorityB: 5,
} as const;

export const UPCOMING_TOURNAMENT_PRIORITY_BONUS_KEYS = new Set<string>([
  RECRUIT_PRIORITY_KEYS.elite,
  RECRUIT_PRIORITY_KEYS.significant,
]);
