"use server";

/**
 * Recruit Profile mutations (BP-045) + Coach Rank (Phase B).
 * Analytics are never written here.
 * Coach Rank multi-row writes go through atomic RPCs only.
 */
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  addUnrankedToCoachRank,
  applyCoachRankOrder,
  createRecruitProfile,
  getCoachRankBoard,
  getRankBoardPersistRow,
  getRecruitProfileByPersonId,
  moveCoachRank,
  RecruitingRepositoryError,
  updateRecruitProfile,
  type CoachRankBoard,
} from "./repository";
import type { RecruitProfile, RecruitProfileWritePatch } from "./types";

export type UpdateRecruitProfileResult =
  | { success: true; profile: RecruitProfile }
  | { success: false; error: string };

export type CoachRankMutationResult =
  | { success: true; board: CoachRankBoard }
  | { success: false; error: string };

async function requireUser(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your session has expired. Please sign in again to save changes.",
    };
  }
  return { ok: true };
}

export async function updateRecruitProfileAction(
  personId: string,
  patch: RecruitProfileWritePatch,
): Promise<UpdateRecruitProfileResult> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const trimmed = personId?.trim() ?? "";
  if (!trimmed) {
    return { success: false, error: "Person is required." };
  }

  try {
    const profile = await updateRecruitProfile(trimmed, patch);
    revalidatePath("/recruiting");
    revalidatePath(`/recruiting/${trimmed}`);
    return { success: true, profile };
  } catch (error) {
    if (error instanceof RecruitingRepositoryError) {
      console.error(`[updateRecruitProfileAction] ${error.message}`);
    } else {
      console.error("[updateRecruitProfileAction] Unexpected error", error);
    }
    return { success: false, error: "We couldn't save your changes. Please try again." };
  }
}

export type UpsertRecruitClassYearResult =
  | { success: true; recruitClassYear: number | null }
  | { success: false; error: string };

/**
 * Persist HS Class onto RecruitProfile.recruitClassYear without touching
 * Person.classYear (Denison graduation). Creates a historical profile only
 * when this Person has none yet.
 */
export async function upsertRecruitClassYearAction(
  personId: string,
  recruitClassYear: number | null,
): Promise<UpsertRecruitClassYearResult> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const trimmed = personId?.trim() ?? "";
  if (!trimmed) {
    return { success: false, error: "Person is required." };
  }

  if (recruitClassYear !== null) {
    if (!Number.isInteger(recruitClassYear) || recruitClassYear < 1900 || recruitClassYear > 2200) {
      return { success: false, error: "HS Class must be a valid year." };
    }
  }

  try {
    const current = await getRecruitProfileByPersonId(trimmed);
    if (!current) {
      if (recruitClassYear === null) {
        return { success: true, recruitClassYear: null };
      }
      const created = await createRecruitProfile({
        personId: trimmed,
        recruitClassYear,
      });
      revalidatePath("/players-coaches");
      revalidatePath(`/players-coaches/${trimmed}`);
      revalidatePath("/recruiting");
      revalidatePath(`/recruiting/${trimmed}`);
      return { success: true, recruitClassYear: created.recruitClassYear ?? null };
    }

    const profile = await updateRecruitProfile(trimmed, { recruitClassYear });
    revalidatePath("/players-coaches");
    revalidatePath(`/players-coaches/${trimmed}`);
    revalidatePath("/recruiting");
    revalidatePath(`/recruiting/${trimmed}`);
    return { success: true, recruitClassYear: profile.recruitClassYear ?? null };
  } catch (error) {
    if (error instanceof RecruitingRepositoryError) {
      console.error(`[upsertRecruitClassYearAction] ${error.message}`);
    } else {
      console.error("[upsertRecruitClassYearAction] Unexpected error", error);
    }
    return { success: false, error: "We couldn't save your changes. Please try again." };
  }
}

/** Persist a full dense Coach Rank order for one class year. */
export async function applyCoachRankOrderAction(
  classYear: number,
  rankedPersonIds: string[],
): Promise<CoachRankMutationResult> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const board = await applyCoachRankOrder(classYear, rankedPersonIds);
    revalidatePath("/recruiting");
    return { success: true, board };
  } catch (error) {
    logCoachRankError("applyCoachRankOrderAction", error);
    return { success: false, error: "We couldn't update Coach Rank. Please try again." };
  }
}

export type RankBoardReorderResult =
  | {
      success: true;
      board: CoachRankBoard;
      tierProfile?: RecruitProfile;
    }
  | { success: false; error: string };

/**
 * One coherent Rank Board save: optional tier patch + dense coachRank order.
 * Single revalidate at the end so mid-flight RSC refresh cannot wipe optimistic order.
 */
export async function applyRankBoardReorderAction(input: {
  classYear: number;
  rankedPersonIds: string[];
  tierUpdate?: { personId: string; tier: 1 | 2 | 3 | 4 | 5 | null };
}): Promise<RankBoardReorderResult> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    let tierProfile: RecruitProfile | undefined;
    if (input.tierUpdate) {
      const personId = input.tierUpdate.personId.trim();
      if (!personId) {
        return { success: false, error: "We couldn't update the Rank Board. Please try again." };
      }
      tierProfile = await updateRecruitProfile(personId, {
        tier: input.tierUpdate.tier,
      });
      const expected = input.tierUpdate.tier;
      const actual = tierProfile.tier ?? null;
      if (actual !== expected) {
        throw new RecruitingRepositoryError(
          `Tier persist mismatch for "${personId}": expected ${String(expected)}, got ${String(actual)}.`,
        );
      }
    }
    const board = await applyCoachRankOrder(
      input.classYear,
      input.rankedPersonIds,
    );
    // Round-trip: dense global order must match what we wrote (within-tier
    // position after refresh depends on this, not on tier alone).
    if (
      board.rankedPersonIds.length !== input.rankedPersonIds.length ||
      !board.rankedPersonIds.every(
        (id, index) => id === input.rankedPersonIds[index],
      )
    ) {
      throw new RecruitingRepositoryError(
        `Coach Rank order persist mismatch for class ${input.classYear}.`,
      );
    }
    if (input.tierUpdate) {
      const movedId = input.tierUpdate.personId.trim();
      const expectedIndex = input.rankedPersonIds.indexOf(movedId);
      const actualIndex = board.rankedPersonIds.indexOf(movedId);
      if (actualIndex < 0 || actualIndex !== expectedIndex) {
        throw new RecruitingRepositoryError(
          `Moved recruit "${movedId}" order mismatch after persist (expected index ${expectedIndex}, got ${actualIndex}).`,
        );
      }
      // Neighbor check: immediate before/after in the read-back board.
      const expectedBefore = input.rankedPersonIds[expectedIndex - 1];
      const expectedAfter = input.rankedPersonIds[expectedIndex + 1];
      const actualBefore = board.rankedPersonIds[actualIndex - 1];
      const actualAfter = board.rankedPersonIds[actualIndex + 1];
      if (expectedBefore !== actualBefore || expectedAfter !== actualAfter) {
        throw new RecruitingRepositoryError(
          `Moved recruit "${movedId}" neighbor mismatch after persist.`,
        );
      }
      // Prove A vs B: coach_rank RPC must not wipe tier. Re-read after order write.
      const expectedTier = input.tierUpdate.tier;
      const persisted = await getRankBoardPersistRow(movedId);
      if (!persisted) {
        throw new RecruitingRepositoryError(
          `Moved recruit "${movedId}" missing after persist.`,
        );
      }
      if ((persisted.tier ?? null) !== expectedTier) {
        throw new RecruitingRepositoryError(
          `Tier wiped after coach rank rewrite for "${movedId}": expected ${String(expectedTier)}, got ${String(persisted.tier)}.`,
        );
      }
      const expectedCoachRank = expectedIndex + 1;
      if (persisted.coachRank !== expectedCoachRank) {
        throw new RecruitingRepositoryError(
          `Coach rank mismatch after persist for "${movedId}": expected ${expectedCoachRank}, got ${String(persisted.coachRank)}.`,
        );
      }
    }
    revalidatePath("/recruiting");
    return { success: true, board, tierProfile };
  } catch (error) {
    logCoachRankError("applyRankBoardReorderAction", error);
    return {
      success: false,
      error: "We couldn't update the Rank Board. Please try again.",
    };
  }
}

/** Move one ranked recruit (master or filtered visible subset). */
export async function moveCoachRankAction(input: {
  classYear: number;
  personId: string;
  toRank: number;
  visiblePersonIds?: string[];
}): Promise<CoachRankMutationResult> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const board = await moveCoachRank(input);
    revalidatePath("/recruiting");
    return { success: true, board };
  } catch (error) {
    logCoachRankError("moveCoachRankAction", error);
    return { success: false, error: "We couldn't move that recruit. Please try again." };
  }
}

/** Add an unranked recruit into the ranked list. */
export async function addUnrankedToCoachRankAction(input: {
  classYear: number;
  personId: string;
  atRank?: number;
}): Promise<CoachRankMutationResult> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const board = await addUnrankedToCoachRank(input);
    revalidatePath("/recruiting");
    return { success: true, board };
  } catch (error) {
    logCoachRankError("addUnrankedToCoachRankAction", error);
    return { success: false, error: "We couldn't add that recruit to the ranking. Please try again." };
  }
}

/** Read-only board snapshot (authenticated). */
export async function getCoachRankBoardAction(
  classYear: number,
): Promise<CoachRankMutationResult> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const board = await getCoachRankBoard(classYear);
    return { success: true, board };
  } catch (error) {
    logCoachRankError("getCoachRankBoardAction", error);
    return { success: false, error: "We couldn't load Coach Rank. Please try again." };
  }
}

function logCoachRankError(label: string, error: unknown): void {
  if (error instanceof RecruitingRepositoryError) {
    console.error(`[${label}] ${error.message}`);
  } else {
    console.error(`[${label}] Unexpected error`, error);
  }
}
