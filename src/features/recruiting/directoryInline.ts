/**
 * Recruiting list inline-edit helpers (BP-045).
 * Recomputes BP-044 analytics in memory; never persists calculated scores.
 */
import type { InlineSelectOption } from "@/components/inline-edit";
import type { LookupSeedRow } from "@/features/lookups/seed";
import type { LookupRef } from "@/features/lookups/types";
import type { Person } from "@/features/people/types";

import { computeRecruitingAnalytics, subjectsFromPeople } from "./analytics";
import type { RecruitDirectoryRow } from "./directory";
import {
  RECRUIT_GETABILITY_SEED,
  RECRUIT_INTEREST_SEED,
  RECRUIT_OUTCOME_SEED,
  RECRUIT_PIPELINE_SEED,
  RECRUIT_PREREAD_SEED,
  RECRUIT_PRIORITY_SEED,
  RECRUIT_TYPE_SEED,
} from "./lookupSeed";
import { parseRecruitTier } from "./tier";
import type { RecruitProfile } from "./types";

export { TIER_SELECT_OPTIONS } from "./tier";

export const RECRUITING_LIST_EDITABLE_FIELDS = [
  "recruitClassYear",
  "pipelineStage",
  "priority",
  "tier",
  "interest",
  "outcome",
  "utr",
  "trnRank",
  "wtn",
] as const;

export type RecruitingListEditableField = (typeof RECRUITING_LIST_EDITABLE_FIELDS)[number];

/** Writable directory fields across List / Card / Rank (shared commit path). */
export const RECRUITING_DIRECTORY_EDITABLE_FIELDS = [
  ...RECRUITING_LIST_EDITABLE_FIELDS,
  "getability",
  "schoolChosen",
] as const;

export type RecruitingDirectoryEditableField =
  (typeof RECRUITING_DIRECTORY_EDITABLE_FIELDS)[number];

export function lookupSelectOptions(seed: readonly LookupSeedRow[]): InlineSelectOption[] {
  return seed
    .filter((row) => row.active)
    .map((row) => ({ value: row.id, label: row.label }));
}

export function lookupRefFromSeed(
  seed: readonly LookupSeedRow[],
  id: string,
): LookupRef | undefined {
  const row = seed.find((entry) => entry.id === id);
  if (!row) return undefined;
  return { id: row.id, key: row.key, label: row.label };
}

export const PIPELINE_SELECT_OPTIONS = lookupSelectOptions(RECRUIT_PIPELINE_SEED);
export const PRIORITY_SELECT_OPTIONS = lookupSelectOptions(RECRUIT_PRIORITY_SEED);
export const INTEREST_SELECT_OPTIONS = lookupSelectOptions(RECRUIT_INTEREST_SEED);
export const OUTCOME_SELECT_OPTIONS = lookupSelectOptions(RECRUIT_OUTCOME_SEED);
export const GETABILITY_SELECT_OPTIONS = lookupSelectOptions(RECRUIT_GETABILITY_SEED);
export const RECRUIT_TYPE_SELECT_OPTIONS = lookupSelectOptions(RECRUIT_TYPE_SEED);
export const PREREAD_SELECT_OPTIONS = lookupSelectOptions(RECRUIT_PREREAD_SEED);

export function recomputeDirectoryAnalytics(
  rows: readonly RecruitDirectoryRow[],
): RecruitDirectoryRow[] {
  const results = computeRecruitingAnalytics(subjectsFromPeople(rows.map((row) => row.person)));
  const byId = new Map(results.map((row) => [row.id, row]));
  return rows.map((row) => {
    const analytics = byId.get(row.person.id);
    if (!analytics) {
      throw new Error(`Missing analytics for ${row.person.id}.`);
    }
    return { ...row, analytics };
  });
}

export function replacePersonInCohort(
  cohort: readonly RecruitDirectoryRow[],
  personId: string,
  person: Person,
): RecruitDirectoryRow[] {
  return recomputeDirectoryAnalytics(
    cohort.map((row) => (row.person.id === personId ? { ...row, person } : row)),
  );
}

export function replaceProfileInCohort(
  cohort: readonly RecruitDirectoryRow[],
  personId: string,
  profile: RecruitProfile,
): RecruitDirectoryRow[] {
  return cohort.map((row) => (row.person.id === personId ? { ...row, profile } : row));
}

export function optimisticLookupProfile(
  profile: RecruitProfile,
  field: "pipelineStage" | "priority" | "interest" | "outcome" | "getability",
  id: string,
): RecruitProfile {
  if (field === "pipelineStage") {
    return {
      ...profile,
      pipelineStageId: id || undefined,
      pipelineStage: id ? lookupRefFromSeed(RECRUIT_PIPELINE_SEED, id) : undefined,
    };
  }
  if (field === "priority") {
    return {
      ...profile,
      priorityId: id || undefined,
      priority: id ? lookupRefFromSeed(RECRUIT_PRIORITY_SEED, id) : undefined,
    };
  }
  if (field === "getability") {
    return {
      ...profile,
      getabilityId: id || undefined,
      getability: id ? lookupRefFromSeed(RECRUIT_GETABILITY_SEED, id) : undefined,
    };
  }
  if (field === "outcome") {
    return {
      ...profile,
      outcomeId: id || undefined,
      outcome: id ? lookupRefFromSeed(RECRUIT_OUTCOME_SEED, id) : undefined,
    };
  }
  return {
    ...profile,
    interestId: id || undefined,
    interest: id ? lookupRefFromSeed(RECRUIT_INTEREST_SEED, id) : undefined,
  };
}
