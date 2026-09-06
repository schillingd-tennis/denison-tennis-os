import HomeDashboard from "@/features/home/HomeDashboard";
import { computeEloRankings, topEloPlayers } from "@/features/intraSquad/elo";
import { loadIntraSquadWorkspaceData } from "@/features/intraSquad/loadWorkspace";
import { computePlayerRecords } from "@/features/intraSquad/records";
import { listVisibleRecruitingInteractions } from "@/features/interactions/repository";
import {
  getDayRuleSummary,
  listDailyPracticePlans,
} from "@/features/practice/repository";
import { recentInteractions, upcomingVisits } from "@/features/recruiting/dashboard";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [intra, dayRule, plans, interactions, directory] = await Promise.all([
    loadIntraSquadWorkspaceData(),
    getDayRuleSummary(),
    listDailyPracticePlans(),
    listVisibleRecruitingInteractions(),
    loadRecruitingDirectory(),
  ]);
  const names = new Map(
    intra.roster.map((player) => [
      player.id,
      [player.preferredName || player.firstName, player.lastName].filter(Boolean).join(" "),
    ]),
  );
  const elo = topEloPlayers(
    computeEloRankings(intra.matches, computePlayerRecords(intra.matches), intra.roster),
  ).map((row) => ({
    id: row.playerId,
    name: names.get(row.playerId) ?? "Player",
    rating: Math.round(row.rating),
    history: row.history.map((point) => Math.round(point.ratingAfter)),
  }));
  const matches = [...intra.matches]
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
    .slice(0, 5)
    .map((match) => ({
      id: match.id,
      date: match.playedAt,
      score: match.scoreText,
      winner:
        names.get(match.winnerPlayerId ?? match.leaderPlayerId ?? "") ?? "Player",
      loser:
        names.get(match.loserPlayerId ?? match.trailingPlayerId ?? "") ?? "Player",
      unfinished: match.status === "unfinished",
    }));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <HomeDashboard
      elo={elo}
      dayRule={dayRule}
      todayPlan={plans.find((plan) => plan.planDate === today) ?? null}
      matches={matches}
      interactions={recentInteractions(interactions, 5)}
      visits={upcomingVisits(directory.rows, { limit: 3 })}
    />
  );
}
