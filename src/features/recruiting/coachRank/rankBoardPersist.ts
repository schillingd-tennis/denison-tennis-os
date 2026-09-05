/**
 * Rank Board persist queue helpers.
 *
 * Cross-tier drops must enqueue BOTH dense coachRank order and a tier patch.
 * Order-only enqueues (densify repair, same-path requeues) must never wipe a
 * pending tierUpdate already sitting on the queue.
 *
 * Coach Rank is the canonical GLOBAL dense 1…N order for the class. After any
 * tier move, persist the flattened Tier 1→5→Unassigned visual sequence — never
 * derive destination index from stale pre-move global ranks.
 */

import type { RecruitBoardTier } from "../tier";

export type RankBoardTierPersist = {
  personId: string;
  tier: RecruitBoardTier | null;
};

export type RankBoardPersistQueue = {
  order: string[] | null;
  tier: RankBoardTierPersist | null;
};

/**
 * Replace the pending order. Only overwrite `tier` when an explicit
 * TierPersist object is provided — `undefined`/`null` leave a queued tier alone.
 */
export function enqueueRankBoardPersist(
  queue: RankBoardPersistQueue,
  next: { order: string[]; tier?: RankBoardTierPersist | null },
): void {
  queue.order = next.order;
  if (next.tier) {
    queue.tier = next.tier;
  }
}

/**
 * Build the tierUpdate payload for drag-end.
 * Prefer the live drag session value; fall back to origin vs current cohort
 * so a lost liveTierRef cannot drop a cross-tier save.
 */
export function resolveTierPersistAfterDrag(input: {
  personId: string;
  liveTier: RankBoardTierPersist | null;
  originTier: RecruitBoardTier | undefined;
  currentTier: RecruitBoardTier | undefined;
}): RankBoardTierPersist | null {
  if (input.liveTier && input.liveTier.personId === input.personId) {
    return input.liveTier;
  }
  const before = input.originTier ?? null;
  const after = input.currentTier ?? null;
  if (before === after) return null;
  return { personId: input.personId, tier: after };
}

/**
 * Prefer the live drag-session master order over a cohort-derived order.
 *
 * pointerup often runs before React commits the last onCohortChange, so reading
 * coachRanks from cohortRef alone re-persisted the PRE-drag global order while
 * liveTierRef still saved the new tier — correct tier, wrong within-tier spot
 * after refresh.
 */
export function resolveOrderPersistAfterDrag(input: {
  liveOrder: string[] | null;
  cohortOrder: string[];
}): string[] {
  return input.liveOrder ?? input.cohortOrder;
}

/** True when two dense ranked-id lists are identical. */
export function sameRankedPersonIds(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Simulate hard-refresh Rank Board order: dense coachRank list + per-id tiers,
 * sorted by rank then grouped Tier 1→5→Unassigned (preserves within-tier rank).
 */
export function refreshModelVisibleOrder(input: {
  rankedPersonIds: readonly string[];
  tierByPersonId: Readonly<Record<string, RecruitBoardTier | null | undefined>>;
}): string[] {
  const sections = [1, 2, 3, 4, 5, "unassigned"] as const;
  type Section = (typeof sections)[number];
  const byTier = new Map<Section, string[]>();
  for (const section of sections) {
    byTier.set(section, []);
  }
  for (const personId of input.rankedPersonIds) {
    const tier = input.tierByPersonId[personId];
    const section: Section =
      tier === 1 || tier === 2 || tier === 3 || tier === 4 || tier === 5
        ? tier
        : "unassigned";
    byTier.get(section)!.push(personId);
  }
  return sections.flatMap((section) => byTier.get(section) ?? []);
}

/** Args shape sent to applyRankBoardReorderAction. */
export function buildRankBoardReorderArgs(input: {
  classYear: number;
  rankedPersonIds: string[];
  tier: RankBoardTierPersist | null;
}): {
  classYear: number;
  rankedPersonIds: string[];
  tierUpdate?: { personId: string; tier: RecruitBoardTier | null };
} {
  return {
    classYear: input.classYear,
    rankedPersonIds: input.rankedPersonIds,
    tierUpdate: input.tier
      ? { personId: input.tier.personId, tier: input.tier.tier }
      : undefined,
  };
}
