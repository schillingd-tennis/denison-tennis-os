"use server";

/**
 * Recruit Profile mutations (BP-045).
 * Analytics are never written here.
 */
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { RecruitingRepositoryError, updateRecruitProfile } from "./repository";
import type { RecruitProfile, RecruitProfileWritePatch } from "./types";

export type UpdateRecruitProfileResult =
  | { success: true; profile: RecruitProfile }
  | { success: false; error: string };

export async function updateRecruitProfileAction(
  personId: string,
  patch: RecruitProfileWritePatch,
): Promise<UpdateRecruitProfileResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Your session has expired. Please sign in again to save changes.",
    };
  }

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
