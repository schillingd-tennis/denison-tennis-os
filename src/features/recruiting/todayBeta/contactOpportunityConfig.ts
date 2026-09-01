/**
 * Temporary contact-opportunity scoring weights for Today Beta v0.1.
 * Adjust here only — not persisted as product policy.
 */
import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";

export const CONTACT_OPPORTUNITY_WEIGHTS = {
  result: {
    win: 15,
  },
  opponentRank: {
    top100: 40,
    rank101to200: 25,
    rank201to300: 10,
    unknownOrWorse: 0,
  },
  recruitPriority: {
    priorityA: 20,
    priorityB: 10,
    other: 0,
  },
  lastContact: {
    days14Plus: 20,
    days7to13: 10,
    days0to6: 0,
  },
  newResult: {
    within48Hours: 10,
  },
} as const;

export const CONTACT_OPPORTUNITY_THRESHOLDS = {
  /** Minimum total score to appear in Contact Today. */
  contactTodayMinScore: 50,
  /** New Results feed window (by firstDetectedAt, NEW status only). */
  newResultWindowDays: 7,
} as const;

/** Maps recruit profile priority keys to scoring tiers. */
export const PRIORITY_A_KEYS = new Set<string>([RECRUIT_PRIORITY_KEYS.elite]);
export const PRIORITY_B_KEYS = new Set<string>([RECRUIT_PRIORITY_KEYS.significant]);
