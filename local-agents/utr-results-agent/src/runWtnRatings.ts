import type { TeamRatingPlayer } from "../../../src/features/teamRatings/types";
import { easternDay } from "./backgroundSchedule.js";
import type { TeamRatingCheckResult } from "./checkTeamRating.js";
import { checkTeamWtnRating } from "./checkWtnRating.js";
import { closeWtnContext, getWtnContext } from "./wtnBrowser.js";

export async function runTeamWtnRatingChecks(
  players: TeamRatingPlayer[],
): Promise<{ ratingDate: string; rows: TeamRatingCheckResult[] }> {
  const rows: TeamRatingCheckResult[] = [];
  try {
    const context = await getWtnContext();
    for (const player of players) {
      const row = await checkTeamWtnRating(context, player);
      rows.push(row);
      if (row.status === "auth_required") break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    return { ratingDate: easternDay(), rows };
  } finally {
    await closeWtnContext();
  }
}
