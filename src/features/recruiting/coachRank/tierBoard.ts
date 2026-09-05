/**
 * Tier-aware Rank Board order helpers.
 *
 * Coach Rank stays a single dense 1…N sequence for the class. Tier sections
 * are a display grouping; drag/drop and tier-dropdown moves rewrite order so
 * the flattened Tier 1…5 → Unassigned list becomes the master board order.
 */

import type { RecruitDirectoryRow } from "../directory";
import {
  groupRankedRowsByTier,
  type RecruitBoardTier,
  type TierSectionId,
  TIER_SECTION_ORDER,
  tierSectionIdForProfile,
} from "../tier";
import { CoachRankError, moveInOrder } from "./engine";

export function tierValueForSection(
  section: TierSectionId,
): RecruitBoardTier | null {
  return section === "unassigned" ? null : section;
}

/** Flatten Rank Board sections in fixed Tier 1…5 → Unassigned order. */
export function flattenRankedTier(
  rankedRows: readonly RecruitDirectoryRow[],
): string[] {
  return groupRankedRowsByTier(rankedRows).flatMap((group) =>
    group.rows.map((row) => row.person.id),
  );
}

/**
 * True when coach-rank order already matches tier-section display order
 * (sequential through tiers).
 */
export function isTierSequentialBoardOrder(
  rankedRows: readonly RecruitDirectoryRow[],
): boolean {
  if (rankedRows.length <= 1) return true;
  const byRank = [...rankedRows]
    .sort(
      (a, b) =>
        (a.profile.coachRank as number) - (b.profile.coachRank as number) ||
        a.person.id.localeCompare(b.person.id),
    )
    .map((row) => row.person.id);
  const byTier = flattenRankedTier(rankedRows);
  if (byRank.length !== byTier.length) return false;
  return byRank.every((id, index) => id === byTier[index]);
}

export function globalIndexForTierInsert(
  rankedRows: readonly RecruitDirectoryRow[],
  section: TierSectionId,
  indexInSection: number,
  excludePersonId?: string,
): number {
  const groups = groupRankedRowsByTier(rankedRows);
  let global = 0;
  for (const group of groups) {
    const ids = group.rows
      .map((row) => row.person.id)
      .filter((id) => id !== excludePersonId);
    if (group.section === section) {
      const clamped = Math.max(0, Math.min(indexInSection, ids.length));
      return global + clamped;
    }
    global += ids.length;
  }
  return global;
}

/**
 * Move a ranked recruit into a tier section at `toIndexInSection`
 * (0…sectionLength after removal; length appends).
 */
export function moveRankedToTierSection(input: {
  rankedRows: readonly RecruitDirectoryRow[];
  personId: string;
  toSection: TierSectionId;
  toIndexInSection: number;
}): {
  nextVisibleOrder: string[];
  nextTier: RecruitBoardTier | null;
} {
  const personId = input.personId.trim();
  if (!personId) throw new CoachRankError("personId is required.");

  const present = input.rankedRows.some((row) => row.person.id === personId);
  if (!present) {
    throw new CoachRankError(`Person ${personId} is not on the Rank Board.`);
  }

  const nextTier = tierValueForSection(input.toSection);
  const without = input.rankedRows.filter((row) => row.person.id !== personId);
  const movedRow = input.rankedRows.find((row) => row.person.id === personId)!;
  const tentative: RecruitDirectoryRow[] = [
    ...without,
    {
      ...movedRow,
      profile: {
        ...movedRow.profile,
        tier: nextTier === null ? undefined : nextTier,
      },
    },
  ];

  const groups = groupRankedRowsByTier(tentative);
  const nextGroups = groups.map((group) => {
    if (group.section !== input.toSection) return group;
    const ids = group.rows.map((row) => row.person.id);
    const withoutMoved = ids.filter((id) => id !== personId);
    const insertAt = Math.max(
      0,
      Math.min(input.toIndexInSection, withoutMoved.length),
    );
    const nextIds = [...withoutMoved];
    nextIds.splice(insertAt, 0, personId);
    const byId = new Map(group.rows.map((row) => [row.person.id, row]));
    // moved row may not be in this group's rows yet if tier just changed
    byId.set(personId, {
      ...movedRow,
      profile: {
        ...movedRow.profile,
        tier: nextTier === null ? undefined : nextTier,
      },
    });
    return {
      ...group,
      rows: nextIds.map((id) => byId.get(id)!),
    };
  });

  return {
    nextVisibleOrder: nextGroups.flatMap((group) =>
      group.rows.map((row) => row.person.id),
    ),
    nextTier,
  };
}

/** Dropdown / explicit tier change: append to bottom of destination section. */
export function appendRankedToTierSection(input: {
  rankedRows: readonly RecruitDirectoryRow[];
  personId: string;
  toSection: TierSectionId;
}): {
  nextVisibleOrder: string[];
  nextTier: RecruitBoardTier | null;
} {
  const groups = groupRankedRowsByTier(
    input.rankedRows.filter((row) => row.person.id !== input.personId),
  );
  const dest = groups.find((group) => group.section === input.toSection);
  const toIndexInSection = dest?.rows.length ?? 0;
  return moveRankedToTierSection({
    ...input,
    toIndexInSection,
  });
}

/**
 * Move ±1 in the flattened tier board (Practice Sequence up/down pattern).
 * Crossing a section boundary adopts the swapped neighbor's tier.
 */
export function moveRankedVisualByDelta(input: {
  rankedRows: readonly RecruitDirectoryRow[];
  personId: string;
  delta: -1 | 1;
}): {
  nextVisibleOrder: string[];
  nextTier: RecruitBoardTier | null;
} | null {
  const visual = flattenRankedTier(input.rankedRows);
  const fromIndex = visual.indexOf(input.personId);
  if (fromIndex < 0) return null;
  const toIndex = fromIndex + input.delta;
  if (toIndex < 0 || toIndex >= visual.length) return null;

  const swappedId = visual[toIndex]!;
  const swapped = input.rankedRows.find((row) => row.person.id === swappedId);
  if (!swapped) return null;

  return {
    nextVisibleOrder: moveInOrder(visual, fromIndex, toIndex),
    nextTier: tierValueForSection(tierSectionIdForProfile(swapped.profile)),
  };
}

export function sectionCounts(
  rankedRows: readonly RecruitDirectoryRow[],
): Record<TierSectionId, number> {
  const counts = Object.fromEntries(
    TIER_SECTION_ORDER.map((section) => [section, 0]),
  ) as Record<TierSectionId, number>;
  for (const row of rankedRows) {
    counts[tierSectionIdForProfile(row.profile)] += 1;
  }
  return counts;
}
