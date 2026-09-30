import { easternDay } from "./backgroundSchedule.js";
import {
  closePersistentContext,
  getPersistentContext,
  isAgentBusy,
  setAgentBusy,
} from "./browser.js";
import { checkTeamUtrRating, type TeamRatingCheckResult } from "./checkTeamRating.js";
import type { TeamRatingPlayer } from "../../../src/features/teamRatings/types";

export async function runTeamUtrRatingChecks(
  players: TeamRatingPlayer[],
): Promise<{ ratingDate: string; rows: TeamRatingCheckResult[] }> {
  if (isAgentBusy()) throw new Error("AGENT_BUSY");
  setAgentBusy(true);
  const rows: TeamRatingCheckResult[] = [];
  try {
    const context = await getPersistentContext({ headless: true });
    for (const player of players) {
      const row = await checkTeamUtrRating(context, player);
      rows.push(row);
      if (row.status === "auth_required") break;
    }
    return { ratingDate: easternDay(), rows };
  } finally {
    await closePersistentContext();
    setAgentBusy(false);
  }
}
