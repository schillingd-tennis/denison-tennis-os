/**
 * Cadence / relationship contact opportunities (Today Beta v0.1).
 */
import type { LookupRef } from "@/features/lookups/types";

import { PRIORITY_A_KEYS } from "./contactOpportunityConfig";
import {
  CADENCE_ELIGIBLE_PRIORITY_KEYS,
  CADENCE_NO_CONTACT_SCORE,
  CADENCE_PRIORITY_A_TIERS,
  CADENCE_PRIORITY_B_TIERS,
} from "./contactCadenceConfig";
import type { ContactOpportunityScoreFactor } from "./contactOpportunityScore";

export type CadenceOpportunity = {
  cadenceScore: number;
  factors: ContactOpportunityScoreFactor[];
};

type CadenceTier = {
  minDays: number;
  maxDays: number | null;
  score: number;
};

function tierForDays(
  tiers: readonly CadenceTier[],
  daysSinceLastContact: number,
): CadenceTier | null {
  for (const tier of tiers) {
    if (daysSinceLastContact < tier.minDays) continue;
    if (tier.maxDays != null && daysSinceLastContact > tier.maxDays) continue;
    return tier;
  }
  return null;
}

function cadenceReason(daysSinceLastContact: number | null): string {
  if (daysSinceLastContact == null) {
    return "No text or call logged";
  }
  if (daysSinceLastContact === 1) {
    return "Last text/call was 1 day ago";
  }
  return `Last text/call was ${daysSinceLastContact} days ago`;
}

export function scoreCadenceOpportunity(input: {
  priority?: LookupRef;
  daysSinceLastContact: number | null;
}): CadenceOpportunity | null {
  const priorityKey = input.priority?.key;
  if (!priorityKey || !CADENCE_ELIGIBLE_PRIORITY_KEYS.has(priorityKey)) {
    return null;
  }

  const isPriorityA = PRIORITY_A_KEYS.has(priorityKey);

  if (input.daysSinceLastContact == null) {
    const score = isPriorityA
      ? CADENCE_NO_CONTACT_SCORE.priorityA
      : CADENCE_NO_CONTACT_SCORE.priorityB;
    return {
      cadenceScore: score,
      factors: [
        {
          key: "cadence_no_contact",
          points: score,
          reason: "No text or call logged",
        },
      ],
    };
  }

  const tiers = isPriorityA ? CADENCE_PRIORITY_A_TIERS : CADENCE_PRIORITY_B_TIERS;
  const tier = tierForDays(tiers, input.daysSinceLastContact);
  if (!tier || tier.score === 0) {
    return null;
  }

  return {
    cadenceScore: tier.score,
    factors: [
      {
        key: "cadence_overdue",
        points: tier.score,
        reason: cadenceReason(input.daysSinceLastContact),
      },
    ],
  };
}
