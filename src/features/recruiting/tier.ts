/**
 * Coach-controlled Rank Board Tier (1–5). Independent of Coach Rank order
 * and of calculated Analytics Tier.
 */
import type { RecruitDirectoryRow } from "./directory";
import type { RecruitProfile } from "./types";

export const RECRUIT_TIERS = [1, 2, 3, 4, 5] as const;
export type RecruitBoardTier = (typeof RECRUIT_TIERS)[number];

export type TierSectionId = RecruitBoardTier | "unassigned";

export const TIER_SECTION_ORDER: readonly TierSectionId[] = [
  1,
  2,
  3,
  4,
  5,
  "unassigned",
] as const;

export function isRecruitBoardTier(value: unknown): value is RecruitBoardTier {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function parseRecruitTier(raw: string): RecruitBoardTier | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!isRecruitBoardTier(n)) return undefined;
  return n;
}

export function formatTierCompact(tier: RecruitBoardTier | null | undefined): string {
  if (tier == null) return "—";
  return `T${tier}`;
}

export function formatTierLabel(tier: RecruitBoardTier | null | undefined): string {
  if (tier == null) return "Unassigned";
  return `Tier ${tier}`;
}

export function tierSectionTitle(section: TierSectionId): string {
  return section === "unassigned" ? "Unassigned" : `Tier ${section}`;
}

export function tierSectionIdForProfile(
  profile: Pick<RecruitProfile, "tier">,
): TierSectionId {
  return isRecruitBoardTier(profile.tier) ? profile.tier : "unassigned";
}

/** Sort key: T1…T5 then Unassigned last. */
export function compareRecruitTier(
  a: RecruitBoardTier | null | undefined,
  b: RecruitBoardTier | null | undefined,
): number {
  const av = a == null ? 6 : a;
  const bv = b == null ? 6 : b;
  return av - bv;
}

export type RankedTierGroup = {
  section: TierSectionId;
  title: string;
  rows: RecruitDirectoryRow[];
};

/**
 * Group Rank Board (coach-ranked) recruits into Tier sections.
 * Preserves incoming coach-rank order within each section.
 */
export function groupRankedRowsByTier(
  rankedRows: readonly RecruitDirectoryRow[],
): RankedTierGroup[] {
  const buckets = new Map<TierSectionId, RecruitDirectoryRow[]>();
  for (const section of TIER_SECTION_ORDER) {
    buckets.set(section, []);
  }
  for (const row of rankedRows) {
    const section = tierSectionIdForProfile(row.profile);
    buckets.get(section)!.push(row);
  }
  return TIER_SECTION_ORDER.map((section) => ({
    section,
    title: tierSectionTitle(section),
    rows: buckets.get(section) ?? [],
  }));
}

export const TIER_SELECT_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "1", label: "T1" },
  { value: "2", label: "T2" },
  { value: "3", label: "T3" },
  { value: "4", label: "T4" },
  { value: "5", label: "T5" },
];

export const TIER_DETAIL_SELECT_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "", label: "Unassigned" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "3", label: "Tier 3" },
  { value: "4", label: "Tier 4" },
  { value: "5", label: "Tier 5" },
];
