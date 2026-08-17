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
  getCoachRankBoard,
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
