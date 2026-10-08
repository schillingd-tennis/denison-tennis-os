import { easternDay } from "./backgroundSchedule.js";
import { checkTrnRating, type TrnRatingCheckResult } from "./checkTrnRating.js";
import { closeTrnContext, getTrnContext } from "./trnBrowser.js";
import type { RecruitRatingPlayer } from "../../../src/features/recruitRatings/types";

const TRN_MIN_PROFILE_DELAY_MS = 6_000;
const TRN_PROFILE_DELAY_JITTER_MS = 4_000;

function nextProfileDelay(): number {
  return TRN_MIN_PROFILE_DELAY_MS + Math.floor(Math.random() * (TRN_PROFILE_DELAY_JITTER_MS + 1));
}

export async function runTrnRatingChecks(
  players: RecruitRatingPlayer[],
): Promise<{ ratingDate: string; rows: TrnRatingCheckResult[]; systemicFailure?: string }> {
  const rows: TrnRatingCheckResult[] = [];
  let consecutiveRankMisses = 0;
  try {
    const context = await getTrnContext();
    for (const [index, player] of players.entries()) {
      const row = await checkTrnRating(context, player);
      rows.push(row);
      if (row.status === "auth_required") break;
      consecutiveRankMisses = row.diagnostic?.startsWith("TRN_RANK_NOT_FOUND")
        ? consecutiveRankMisses + 1
        : 0;
      if (consecutiveRankMisses >= 3) {
        return {
          ratingDate: easternDay(),
          rows,
          systemicFailure: "TRN stopped after three consecutive profile pages had no readable ranking. The site layout, verification, or login state needs attention; remaining recruits were not falsely marked as failures.",
        };
      }
      if (index < players.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, nextProfileDelay()));
      }
    }
    return { ratingDate: easternDay(), rows };
  } finally {
    await closeTrnContext();
  }
}
