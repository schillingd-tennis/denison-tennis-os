/**
 * Recruit Profile repository (BP-043C).
 *
 * Runtime reads/writes go only to Supabase `recruit_profiles`.
 * No Coda import in this milestone.
 */
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  recruitProfilePatchToRow,
  rowToRecruitProfile,
  type RecruitProfileRow,
} from "./supabaseMapping";
import type { CreateRecruitProfileInput, RecruitProfile, RecruitProfileWritePatch } from "./types";

const TABLE = "recruit_profiles";

const RECRUIT_PROFILE_SELECT = `
  *,
  recruit_type:recruit_types!recruit_type_id ( id, key, label, sort_order, active ),
  pipeline_stage:recruit_pipeline_stages!pipeline_stage_id ( id, key, label, sort_order, active ),
  interest:recruit_interests!interest_id ( id, key, label, sort_order, active ),
  outcome:recruit_outcomes!outcome_id ( id, key, label, sort_order, active ),
  priority:recruit_priorities!priority_id ( id, key, label, sort_order, active ),
  getability:recruit_getabilities!getability_id ( id, key, label, sort_order, active ),
  preread_status:recruit_preread_statuses!preread_status_id ( id, key, label, sort_order, active )
`;

export class RecruitingRepositoryError extends Error {}

export async function getRecruitProfileByPersonId(
  personId: string,
): Promise<RecruitProfile | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(RECRUIT_PROFILE_SELECT)
    .eq("person_id", personId)
    .maybeSingle();

  if (error) {
    throw new RecruitingRepositoryError(
      `Failed to load recruit profile for person "${personId}": ${error.message}`,
    );
  }

  return data ? rowToRecruitProfile(data as RecruitProfileRow) : null;
}

export async function createRecruitProfile(
  input: CreateRecruitProfileInput,
): Promise<RecruitProfile> {
  const personId = input.personId.trim();
  if (!personId) {
    throw new RecruitingRepositoryError("person_id is required.");
  }

  const patchRow = recruitProfilePatchToRow(input);
  const row: Record<string, unknown> = {
    ...patchRow,
    person_id: personId,
  };

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .insert(row)
    .select(RECRUIT_PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    throw new RecruitingRepositoryError(
      `Failed to create recruit profile for person "${personId}": ${error.message}`,
    );
  }

  if (!data) {
    throw new RecruitingRepositoryError(
      `Failed to create recruit profile for person "${personId}": no row returned.`,
    );
  }

  return rowToRecruitProfile(data as RecruitProfileRow);
}

export async function updateRecruitProfile(
  personId: string,
  patch: RecruitProfileWritePatch,
): Promise<RecruitProfile> {
  const patchRow = recruitProfilePatchToRow(patch);

  if (Object.keys(patchRow).length === 0) {
    const current = await getRecruitProfileByPersonId(personId);
    if (!current) {
      throw new RecruitingRepositoryError(
        `Cannot update recruit profile for person "${personId}": no such profile.`,
      );
    }
    return current;
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .update(patchRow)
    .eq("person_id", personId)
    .select(RECRUIT_PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    throw new RecruitingRepositoryError(
      `Failed to update recruit profile for person "${personId}": ${error.message}`,
    );
  }

  if (!data) {
    throw new RecruitingRepositoryError(
      `Cannot update recruit profile for person "${personId}": no such profile.`,
    );
  }

  return rowToRecruitProfile(data as RecruitProfileRow);
}
