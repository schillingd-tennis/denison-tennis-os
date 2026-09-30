"use server";

import { revalidatePath } from "next/cache";

import { TEAM_RATINGS_ROUTE } from "@/lib/module-routes";

import { requestTeamRatingJob } from "./repository";

export async function requestTeamUtrRatingsAction(): Promise<void> {
  await requestTeamRatingJob("utr");
  revalidatePath(TEAM_RATINGS_ROUTE);
}
