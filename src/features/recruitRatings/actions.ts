"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RECRUITING_RATINGS_ROUTE } from "@/lib/module-routes";

import { getLatestRecruitRatingJob, requestRecruitRatingJob } from "./repository";
import type { RecruitRatingJobStatus, RecruitRatingProvider } from "./types";

export async function requestRecruitRatingsAction(provider: RecruitRatingProvider): Promise<RecruitRatingJobStatus | null> {
  if (!(["utr", "wtn", "trn"] as const).includes(provider)) throw new Error("Unsupported provider.");
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  await requestRecruitRatingJob(provider);
  revalidatePath(RECRUITING_RATINGS_ROUTE);
  return getLatestRecruitRatingJob(provider);
}

export async function getRecruitRatingsJobStatusAction(
  provider: RecruitRatingProvider,
): Promise<RecruitRatingJobStatus | null> {
  if (!(["utr", "wtn", "trn"] as const).includes(provider)) throw new Error("Unsupported provider.");
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  return getLatestRecruitRatingJob(provider);
}
