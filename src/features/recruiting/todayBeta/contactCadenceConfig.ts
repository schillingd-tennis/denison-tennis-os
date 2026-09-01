/**
 * Contact cadence thresholds and scores (Today Beta v0.1).
 * Adjust timing rules here only — not persisted as product policy.
 */
import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";

export const CADENCE_CONTACT_TODAY_MIN_SCORE = 50;

/** Days-since-contact tiers for Priority A (1 - Elite). */
export const CADENCE_PRIORITY_A_TIERS = [
  { minDays: 0, maxDays: 6, score: 0 },
  { minDays: 7, maxDays: 9, score: 40 },
  { minDays: 10, maxDays: 13, score: 60 },
  { minDays: 14, maxDays: null, score: 80 },
] as const;

/** Days-since-contact tiers for Priority B (2 - Significant). */
export const CADENCE_PRIORITY_B_TIERS = [
  { minDays: 0, maxDays: 9, score: 0 },
  { minDays: 10, maxDays: 13, score: 40 },
  { minDays: 14, maxDays: 20, score: 60 },
  { minDays: 21, maxDays: null, score: 80 },
] as const;

export const CADENCE_NO_CONTACT_SCORE = {
  priorityA: 80,
  priorityB: 60,
} as const;

export const CADENCE_ELIGIBLE_PRIORITY_KEYS = new Set<string>([
  RECRUIT_PRIORITY_KEYS.elite,
  RECRUIT_PRIORITY_KEYS.significant,
]);
