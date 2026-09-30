import { easternDay } from "./backgroundSchedule.js";
import {
  closePersistentContext,
  getPersistentContext,
  isAgentBusy,
  setAgentBusy,
} from "./browser.js";
import { checkTeamUtrRating, type TeamRatingCheckResult } from "./checkTeamRating.js";
import { checkDenisonPower6, type TeamPower6CheckResult } from "./checkTeamPower6.js";
import type { TeamRatingPlayer } from "../../../src/features/teamRatings/types";

export async function runTeamUtrRatingChecks(
  players: TeamRatingPlayer[],
): Promise<{ ratingDate: string; rows: TeamRatingCheckResult[]; power6: TeamPower6CheckResult }> {
  if (isAgentBusy()) throw new Error("AGENT_BUSY");
  setAgentBusy(true);
  const rows: TeamRatingCheckResult[] = [];
  try {
    const context = await getPersistentContext({ headless: true });
    const power6 = await checkDenisonPower6(context);
    for (const player of players) {
      const row = await checkTeamUtrRating(context, player);
      rows.push(row);
      if (row.status === "auth_required") break;
    }
    return { ratingDate: easternDay(), rows, power6 };
  } finally {
    await closePersistentContext();
    setAgentBusy(false);
  }
}
