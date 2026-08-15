/**
 * Boundary mapping between `recruit_profiles` and RecruitProfile (BP-043C).
 */
import type { LookupRef } from "@/features/lookups/types";

import { getWritableRecruitProfileFieldMap } from "./fieldCatalog";
import {
  RECRUIT_GETABILITY_SEED,
  RECRUIT_INTEREST_SEED,
  RECRUIT_OUTCOME_SEED,
  RECRUIT_PIPELINE_SEED,
  RECRUIT_PREREAD_SEED,
  RECRUIT_PRIORITY_SEED,
  RECRUIT_TYPE_SEED,
} from "./lookupSeed";
import type { CodaExportPayload, RecruitProfile, RecruitProfileWritePatch } from "./types";

type NestedLookup = {
  id: string;
  key: string;
  label: string;
  sort_order?: number;
  active?: boolean;
};

export type RecruitProfileRow = {
  id: string;
  person_id: string;
  created_at: string;
  updated_at: string;
  recruit_type_id: string | null;
  pipeline_stage_id: string | null;
  interest_id: string | null;
  outcome_id: string | null;
  coda_pipeline_stage: string | null;
  coda_interest: string | null;
  priority_id: string | null;
  getability_id: string | null;
  focus: boolean | null;
  gpa: string | null;
  sat: number | null;
  act: number | null;
  academic_interests: string | null;
  preread_status_id: string | null;
  preread_scholarship_amount: number | string | null;
  schools_of_interest: string | null;
  school_chosen: string | null;
  notes: string | null;
  game_notes: string | null;
  key_pitch_angle: string | null;
  coda_row_id: string | null;
  coda_export: CodaExportPayload | null;
  recruit_type?: NestedLookup | NestedLookup[] | null;
  pipeline_stage?: NestedLookup | NestedLookup[] | null;
  interest?: NestedLookup | NestedLookup[] | null;
  outcome?: NestedLookup | NestedLookup[] | null;
  priority?: NestedLookup | NestedLookup[] | null;
  getability?: NestedLookup | NestedLookup[] | null;
  preread_status?: NestedLookup | NestedLookup[] | null;
};

function undefinedIfNull<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

function asLookup(value: NestedLookup | NestedLookup[] | null | undefined): NestedLookup | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function lookupRef(
  nested: NestedLookup | NestedLookup[] | null | undefined,
  fallbackId: string | null,
  seed: readonly { id: string; key: string; label: string }[],
): LookupRef | undefined {
  if (!fallbackId) return undefined;
  const resolved = asLookup(nested);
  if (resolved) {
    return { id: resolved.id, key: resolved.key, label: resolved.label };
  }
  const fromSeed = seed.find((entry) => entry.id === fallbackId);
  if (fromSeed) {
    return { id: fromSeed.id, key: fromSeed.key, label: fromSeed.label };
  }
  return { id: fallbackId, key: "unknown", label: "Unknown" };
}

function asCodaExport(value: CodaExportPayload | null): CodaExportPayload | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value;
}

function asNumber(value: number | string | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function rowToRecruitProfile(row: RecruitProfileRow): RecruitProfile {
  return {
    id: row.id,
    personId: row.person_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    recruitTypeId: undefinedIfNull(row.recruit_type_id),
    recruitType: lookupRef(row.recruit_type, row.recruit_type_id, RECRUIT_TYPE_SEED),
    pipelineStageId: undefinedIfNull(row.pipeline_stage_id),
    pipelineStage: lookupRef(row.pipeline_stage, row.pipeline_stage_id, RECRUIT_PIPELINE_SEED),
    interestId: undefinedIfNull(row.interest_id),
    interest: lookupRef(row.interest, row.interest_id, RECRUIT_INTEREST_SEED),
    outcomeId: undefinedIfNull(row.outcome_id),
    outcome: lookupRef(row.outcome, row.outcome_id, RECRUIT_OUTCOME_SEED),

    codaPipelineStage: undefinedIfNull(row.coda_pipeline_stage),
    codaInterest: undefinedIfNull(row.coda_interest),

    priorityId: undefinedIfNull(row.priority_id),
    priority: lookupRef(row.priority, row.priority_id, RECRUIT_PRIORITY_SEED),
    getabilityId: undefinedIfNull(row.getability_id),
    getability: lookupRef(row.getability, row.getability_id, RECRUIT_GETABILITY_SEED),
    focus: undefinedIfNull(row.focus),

    gpa: undefinedIfNull(row.gpa),
    sat: asNumber(row.sat),
    act: asNumber(row.act),
    academicInterests: undefinedIfNull(row.academic_interests),

    prereadStatusId: undefinedIfNull(row.preread_status_id),
    prereadStatus: lookupRef(row.preread_status, row.preread_status_id, RECRUIT_PREREAD_SEED),
    prereadScholarshipAmount: asNumber(row.preread_scholarship_amount),

    schoolsOfInterest: undefinedIfNull(row.schools_of_interest),
    schoolChosen: undefinedIfNull(row.school_chosen),
    notes: undefinedIfNull(row.notes),
    gameNotes: undefinedIfNull(row.game_notes),
    keyPitchAngle: undefinedIfNull(row.key_pitch_angle),

    codaRowId: undefinedIfNull(row.coda_row_id),
    codaExport: asCodaExport(row.coda_export),
  };
}

const WRITABLE_FIELD_MAP = getWritableRecruitProfileFieldMap();

const JOIN_ONLY_KEYS = new Set<keyof RecruitProfile>([
  "recruitType",
  "pipelineStage",
  "interest",
  "outcome",
  "priority",
  "getability",
  "prereadStatus",
]);

export function recruitProfilePatchToRow(
  patch: RecruitProfileWritePatch,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const key of Object.keys(patch) as (keyof RecruitProfile)[]) {
    if (JOIN_ONLY_KEYS.has(key)) continue;
    const rowKey = WRITABLE_FIELD_MAP[key];
    if (!rowKey) continue;
    const value = patch[key];
    row[rowKey] = value ?? null;
  }

  return row;
}
