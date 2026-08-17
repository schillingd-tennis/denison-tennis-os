/**
 * Recruit Profile repository (BP-043C + Coach Rank Phase B).
 *
 * Runtime reads/writes go only to Supabase `recruit_profiles`.
 * Coach Rank multi-row mutations use atomic Postgres RPCs.
 */
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  appendUnranked,
  insertUnrankedAt,
  moveByRank,
  moveVisibleByRank,
} from "./coachRank";
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

export type CoachRankBoard = {
  classYear: number;
  rankedPersonIds: string[];
  unrankedPersonIds: string[];
};

export async function listRecruitProfiles(): Promise<RecruitProfile[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(RECRUIT_PROFILE_SELECT)
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) {
    throw new RecruitingRepositoryError(`Failed to load recruit profiles: ${error.message}`);
  }

  return (data as RecruitProfileRow[] | null ?? []).map(rowToRecruitProfile);
}

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

  // Coach Rank starts NULL; never accept coachRank on create.
  const safeInput = { ...input };
  delete safeInput.coachRank;
  const patchRow = recruitProfilePatchToRow(safeInput);
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
  const trimmed = personId.trim();
  if (!trimmed) {
    throw new RecruitingRepositoryError("person_id is required.");
  }

  // Coach Rank is never mutated through the general profile patch path.
  const rest: RecruitProfileWritePatch = { ...patch };
  delete rest.coachRank;
  const recruitClassYear = patch.recruitClassYear;

  if ("recruitClassYear" in patch) {
    delete rest.recruitClassYear;
    const current = await getRecruitProfileByPersonId(trimmed);
    if (!current) {
      throw new RecruitingRepositoryError(
        `Cannot update recruit profile for person "${trimmed}": no such profile.`,
      );
    }

    const nextYear =
      recruitClassYear === null || recruitClassYear === undefined
        ? null
        : Number(recruitClassYear);

    if (nextYear !== null && (!Number.isInteger(nextYear) || nextYear < 1900 || nextYear > 2200)) {
      throw new RecruitingRepositoryError(`Invalid recruit class year: ${String(recruitClassYear)}`);
    }

    const currentYear = current.recruitClassYear ?? null;
    if (currentYear !== nextYear) {
      await reassignRecruitClassYear(trimmed, nextYear);
    }

    const remainingKeys = Object.keys(rest) as (keyof RecruitProfileWritePatch)[];
    if (remainingKeys.length === 0) {
      const refreshed = await getRecruitProfileByPersonId(trimmed);
      if (!refreshed) {
        throw new RecruitingRepositoryError(
          `Cannot update recruit profile for person "${trimmed}": no such profile.`,
        );
      }
      return refreshed;
    }

    return updateRecruitProfile(trimmed, rest);
  }

  const patchRow = recruitProfilePatchToRow(rest);

  if (Object.keys(patchRow).length === 0) {
    const current = await getRecruitProfileByPersonId(trimmed);
    if (!current) {
      throw new RecruitingRepositoryError(
        `Cannot update recruit profile for person "${trimmed}": no such profile.`,
      );
    }
    return current;
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .update(patchRow)
    .eq("person_id", trimmed)
    .select(RECRUIT_PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    throw new RecruitingRepositoryError(
      `Failed to update recruit profile for person "${trimmed}": ${error.message}`,
    );
  }

  if (!data) {
    throw new RecruitingRepositoryError(
      `Cannot update recruit profile for person "${trimmed}": no such profile.`,
    );
  }

  return rowToRecruitProfile(data as RecruitProfileRow);
}

/** Load ranked + unranked person ids for one class year. */
export async function getCoachRankBoard(classYear: number): Promise<CoachRankBoard> {
  assertClassYear(classYear);

  const { data, error } = await supabase
    .from(TABLE)
    .select("person_id, coach_rank")
    .eq("recruit_class_year", classYear)
    .limit(5000);

  if (error) {
    throw new RecruitingRepositoryError(
      `Failed to load Coach Rank board for ${classYear}: ${error.message}`,
    );
  }

  const rows = (data as { person_id: string; coach_rank: number | null }[] | null) ?? [];
  const ranked = rows
    .filter((row) => row.coach_rank !== null && row.coach_rank !== undefined)
    .sort((a, b) => (a.coach_rank as number) - (b.coach_rank as number));
  const unranked = rows
    .filter((row) => row.coach_rank === null || row.coach_rank === undefined)
    .map((row) => row.person_id);

  return {
    classYear,
    rankedPersonIds: ranked.map((row) => row.person_id),
    unrankedPersonIds: unranked,
  };
}

/**
 * Atomically rewrite Coach Rank for one class year.
 * `rankedPersonIds` is the full dense order (1…N). Others in the class become NULL.
 */
export async function applyCoachRankOrder(
  classYear: number,
  rankedPersonIds: readonly string[],
): Promise<CoachRankBoard> {
  assertClassYear(classYear);

  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("apply_recruit_class_coach_ranks", {
    p_class_year: classYear,
    p_ranked_person_ids: [...rankedPersonIds],
  });

  if (error) {
    throw new RecruitingRepositoryError(
      `Failed to apply Coach Rank for ${classYear}: ${error.message}`,
    );
  }

  return getCoachRankBoard(classYear);
}

/** Move a ranked recruit within the class (optionally within a filtered visible subset). */
export async function moveCoachRank(input: {
  classYear: number;
  personId: string;
  toRank: number;
  /** When set, `toRank` is relative to this filtered visible subset. */
  visiblePersonIds?: readonly string[];
}): Promise<CoachRankBoard> {
  const board = await getCoachRankBoard(input.classYear);
  const personId = input.personId.trim();
  const fromRank = board.rankedPersonIds.indexOf(personId) + 1;
  if (fromRank < 1) {
    throw new RecruitingRepositoryError(
      `Person "${personId}" is not ranked in class ${input.classYear}.`,
    );
  }

  const nextOrder = input.visiblePersonIds
    ? moveVisibleByRank(
        board.rankedPersonIds,
        input.visiblePersonIds,
        input.visiblePersonIds.indexOf(personId) + 1,
        input.toRank,
      )
    : moveByRank(board.rankedPersonIds, fromRank, input.toRank);

  return applyCoachRankOrder(input.classYear, nextOrder);
}

/** Add an unranked recruit into the ranked list (append or insert at 1-based rank). */
export async function addUnrankedToCoachRank(input: {
  classYear: number;
  personId: string;
  /** 1-based insert position; omit to append. */
  atRank?: number;
}): Promise<CoachRankBoard> {
  const board = await getCoachRankBoard(input.classYear);
  const personId = input.personId.trim();

  if (!board.unrankedPersonIds.includes(personId) && !board.rankedPersonIds.includes(personId)) {
    throw new RecruitingRepositoryError(
      `Person "${personId}" is not in recruit class ${input.classYear}.`,
    );
  }
  if (board.rankedPersonIds.includes(personId)) {
    throw new RecruitingRepositoryError(
      `Person "${personId}" is already ranked in class ${input.classYear}.`,
    );
  }

  const nextOrder =
    input.atRank === undefined
      ? appendUnranked(board.rankedPersonIds, personId)
      : insertUnrankedAt(board.rankedPersonIds, personId, input.atRank);

  return applyCoachRankOrder(input.classYear, nextOrder);
}

async function reassignRecruitClassYear(
  personId: string,
  newClassYear: number | null,
): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("reassign_recruit_class_year", {
    p_person_id: personId,
    p_new_class_year: newClassYear,
  });

  if (error) {
    throw new RecruitingRepositoryError(
      `Failed to reassign class year for "${personId}": ${error.message}`,
    );
  }
}

function assertClassYear(classYear: number): void {
  if (!Number.isInteger(classYear) || classYear < 1900 || classYear > 2200) {
    throw new RecruitingRepositoryError(`Invalid recruit class year: ${classYear}`);
  }
}
