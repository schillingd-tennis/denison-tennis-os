import { easternDay } from "./backgroundSchedule.js";
import { checkTrnRating, type TrnRatingCheckResult } from "./checkTrnRating.js";
import { closeTrnContext, getTrnContext } from "./trnBrowser.js";
import type { RecruitRatingPlayer } from "../../../src/features/recruitRatings/types";

export async function runTrnRatingChecks(
  players: RecruitRatingPlayer[],
): Promise<{ ratingDate: string; rows: TrnRatingCheckResult[] }> {
  const rows: TrnRatingCheckResult[] = [];
  try {
    const context = await getTrnContext();
    for (const player of players) {
      const row = await checkTrnRating(context, player);
      rows.push(row);
      if (row.status === "auth_required") break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    return { ratingDate: easternDay(), rows };
  } finally {
    await closeTrnContext();
  }
}
