/**
 * Canonical recruiting classification lookup seed (BP-043C).
 * UUIDs are fixed so migrations and TypeScript stay aligned.
 */
import type { LookupSeedRow } from "@/features/lookups/seed";

export const RECRUIT_TYPE_KEYS = {
  highSchool: "high_school",
  transfer: "transfer",
  international: "international",
} as const;

export type RecruitTypeKey = (typeof RECRUIT_TYPE_KEYS)[keyof typeof RECRUIT_TYPE_KEYS];

export const RECRUIT_PIPELINE_KEYS = {
  potential: "potential",
  active: "active",
  committed: "committed",
  closed: "closed",
  unknown: "unknown",
} as const;

export type RecruitPipelineKey =
  (typeof RECRUIT_PIPELINE_KEYS)[keyof typeof RECRUIT_PIPELINE_KEYS];

export const RECRUIT_INTEREST_KEYS = {
  high: "high",
  medium: "medium",
  low: "low",
  unknown: "unknown",
} as const;

export type RecruitInterestKey =
  (typeof RECRUIT_INTEREST_KEYS)[keyof typeof RECRUIT_INTEREST_KEYS];

export const RECRUIT_OUTCOME_KEYS = {
  committedDenison: "committed_denison",
  committedElsewhere: "committed_elsewhere",
  noLongerRecruiting: "no_longer_recruiting",
} as const;

export type RecruitOutcomeKey =
  (typeof RECRUIT_OUTCOME_KEYS)[keyof typeof RECRUIT_OUTCOME_KEYS];

export const RECRUIT_PRIORITY_KEYS = {
  elite: "elite",
  significant: "significant",
  potential: "potential",
  probablyNot: "probably_not",
} as const;

export type RecruitPriorityKey =
  (typeof RECRUIT_PRIORITY_KEYS)[keyof typeof RECRUIT_PRIORITY_KEYS];

export const RECRUIT_GETABILITY_KEYS = {
  highlyLikely: "highly_likely",
  greatChance: "great_chance",
  haveAChance: "have_a_chance",
  unlikely: "unlikely",
  noChance: "no_chance",
} as const;

export type RecruitGetabilityKey =
  (typeof RECRUIT_GETABILITY_KEYS)[keyof typeof RECRUIT_GETABILITY_KEYS];

export const RECRUIT_PREREAD_KEYS = {
  green: "green",
  yellow: "yellow",
} as const;

export type RecruitPrereadKey =
  (typeof RECRUIT_PREREAD_KEYS)[keyof typeof RECRUIT_PREREAD_KEYS];

export const RECRUIT_TYPE_SEED: readonly LookupSeedRow[] = [
  {
    id: "c1100000-0000-4000-8000-000000000001",
    key: RECRUIT_TYPE_KEYS.highSchool,
    label: "High School",
    sortOrder: 1,
    active: true,
  },
  {
    id: "c1100000-0000-4000-8000-000000000002",
    key: RECRUIT_TYPE_KEYS.transfer,
    label: "Transfer",
    sortOrder: 2,
    active: true,
  },
  {
    id: "c1100000-0000-4000-8000-000000000003",
    key: RECRUIT_TYPE_KEYS.international,
    label: "International",
    sortOrder: 3,
    active: true,
  },
] as const;

export const RECRUIT_PIPELINE_SEED: readonly LookupSeedRow[] = [
  {
    id: "c1200000-0000-4000-8000-000000000001",
    key: RECRUIT_PIPELINE_KEYS.potential,
    label: "Potential",
    sortOrder: 1,
    active: true,
  },
  {
    id: "c1200000-0000-4000-8000-000000000002",
    key: RECRUIT_PIPELINE_KEYS.active,
    label: "Active Recruit",
    sortOrder: 2,
    active: true,
  },
  {
    id: "c1200000-0000-4000-8000-000000000003",
    key: RECRUIT_PIPELINE_KEYS.committed,
    label: "Committed",
    sortOrder: 3,
    active: true,
  },
  {
    id: "c1200000-0000-4000-8000-000000000004",
    key: RECRUIT_PIPELINE_KEYS.closed,
    label: "Closed",
    sortOrder: 4,
    active: true,
  },
  {
    id: "c1200000-0000-4000-8000-000000000005",
    key: RECRUIT_PIPELINE_KEYS.unknown,
    label: "Unknown",
    sortOrder: 5,
    active: true,
  },
] as const;

export const RECRUIT_INTEREST_SEED: readonly LookupSeedRow[] = [
  {
    id: "c1300000-0000-4000-8000-000000000001",
    key: RECRUIT_INTEREST_KEYS.high,
    label: "High",
    sortOrder: 1,
    active: true,
  },
  {
    id: "c1300000-0000-4000-8000-000000000002",
    key: RECRUIT_INTEREST_KEYS.medium,
    label: "Medium",
    sortOrder: 2,
    active: true,
  },
  {
    id: "c1300000-0000-4000-8000-000000000003",
    key: RECRUIT_INTEREST_KEYS.low,
    label: "Low",
    sortOrder: 3,
    active: true,
  },
  {
    id: "c1300000-0000-4000-8000-000000000004",
    key: RECRUIT_INTEREST_KEYS.unknown,
    label: "Unknown",
    sortOrder: 4,
    active: true,
  },
] as const;

export const RECRUIT_OUTCOME_SEED: readonly LookupSeedRow[] = [
  {
    id: "c1400000-0000-4000-8000-000000000001",
    key: RECRUIT_OUTCOME_KEYS.committedDenison,
    label: "Committed to Denison",
    sortOrder: 1,
    active: true,
  },
  {
    id: "c1400000-0000-4000-8000-000000000002",
    key: RECRUIT_OUTCOME_KEYS.committedElsewhere,
    label: "Committed Elsewhere",
    sortOrder: 2,
    active: true,
  },
  {
    id: "c1400000-0000-4000-8000-000000000003",
    key: RECRUIT_OUTCOME_KEYS.noLongerRecruiting,
    label: "No Longer Recruiting",
    sortOrder: 3,
    active: true,
  },
] as const;

export const RECRUIT_PRIORITY_SEED: readonly LookupSeedRow[] = [
  {
    id: "c1500000-0000-4000-8000-000000000001",
    key: RECRUIT_PRIORITY_KEYS.elite,
    label: "1 - Elite",
    sortOrder: 1,
    active: true,
  },
  {
    id: "c1500000-0000-4000-8000-000000000002",
    key: RECRUIT_PRIORITY_KEYS.significant,
    label: "2 - Significant",
    sortOrder: 2,
    active: true,
  },
  {
    id: "c1500000-0000-4000-8000-000000000003",
    key: RECRUIT_PRIORITY_KEYS.potential,
    label: "3 - Potential",
    sortOrder: 3,
    active: true,
  },
  {
    id: "c1500000-0000-4000-8000-000000000004",
    key: RECRUIT_PRIORITY_KEYS.probablyNot,
    label: "4 - Probably Not",
    sortOrder: 4,
    active: true,
  },
] as const;

export const RECRUIT_GETABILITY_SEED: readonly LookupSeedRow[] = [
  {
    id: "c1600000-0000-4000-8000-000000000001",
    key: RECRUIT_GETABILITY_KEYS.highlyLikely,
    label: "1 - Highly Likely",
    sortOrder: 1,
    active: true,
  },
  {
    id: "c1600000-0000-4000-8000-000000000002",
    key: RECRUIT_GETABILITY_KEYS.greatChance,
    label: "2 - Great Chance",
    sortOrder: 2,
    active: true,
  },
  {
    id: "c1600000-0000-4000-8000-000000000003",
    key: RECRUIT_GETABILITY_KEYS.haveAChance,
    label: "3 - Have a Chance",
    sortOrder: 3,
    active: true,
  },
  {
    id: "c1600000-0000-4000-8000-000000000004",
    key: RECRUIT_GETABILITY_KEYS.unlikely,
    label: "4 - Unlikely",
    sortOrder: 4,
    active: true,
  },
  {
    id: "c1600000-0000-4000-8000-000000000005",
    key: RECRUIT_GETABILITY_KEYS.noChance,
    label: "5 - No Chance",
    sortOrder: 5,
    active: true,
  },
] as const;

export const RECRUIT_PREREAD_SEED: readonly LookupSeedRow[] = [
  {
    id: "c1700000-0000-4000-8000-000000000001",
    key: RECRUIT_PREREAD_KEYS.green,
    label: "Green",
    sortOrder: 1,
    active: true,
  },
  {
    id: "c1700000-0000-4000-8000-000000000002",
    key: RECRUIT_PREREAD_KEYS.yellow,
    label: "Yellow",
    sortOrder: 2,
    active: true,
  },
] as const;

function idForKey(seed: readonly LookupSeedRow[], key: string): string {
  const row = seed.find((entry) => entry.key === key);
  if (!row) throw new Error(`Unknown recruiting lookup key: ${key}`);
  return row.id;
}

export function recruitTypeIdForKey(key: string): string {
  return idForKey(RECRUIT_TYPE_SEED, key);
}

export function recruitPipelineIdForKey(key: string): string {
  return idForKey(RECRUIT_PIPELINE_SEED, key);
}

export function recruitInterestIdForKey(key: string): string {
  return idForKey(RECRUIT_INTEREST_SEED, key);
}

export function recruitOutcomeIdForKey(key: string): string {
  return idForKey(RECRUIT_OUTCOME_SEED, key);
}

export function recruitPriorityIdForKey(key: string): string {
  return idForKey(RECRUIT_PRIORITY_SEED, key);
}

export function recruitGetabilityIdForKey(key: string): string {
  return idForKey(RECRUIT_GETABILITY_SEED, key);
}

export function recruitPrereadIdForKey(key: string): string {
  return idForKey(RECRUIT_PREREAD_SEED, key);
}
