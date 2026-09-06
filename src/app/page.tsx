import HomeDashboard from "@/features/home/HomeDashboard";
import { computeEloRankings, topEloPlayers } from "@/features/intraSquad/elo";
import { loadIntraSquadWorkspaceData } from "@/features/intraSquad/loadWorkspace";
import { computePlayerRecords } from "@/features/intraSquad/records";
import { listVisibleRecruitingInteractions } from "@/features/interactions/repository";
import {
  getDayRuleSummary,
} from "@/features/practice/repository";
import { recentInteractions, upcomingVisits } from "@/features/recruiting/dashboard";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import { listRecentUtrRecruitResults } from "@/features/recruiting/todayBeta/repository";
import { listScheduleEvents } from "@/features/teamSchedule/repository";
import { resolveScheduleIdentity } from "@/features/teamSchedule/schoolIdentity";
import { displayOpponentOrEvent } from "@/features/teamSchedule/types";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [intra, dayRule, interactions, directory, utrResults, schedule] = await Promise.all([
    loadIntraSquadWorkspaceData(),
    getDayRuleSummary(),
    listVisibleRecruitingInteractions(),
    loadRecruitingDirectory(),
    listRecentUtrRecruitResults(5),
    listScheduleEvents(),
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
  const currentMonth = dayRule.rows.find((row) => row.month === new Date().getMonth() + 1);
  const events = schedule
    .filter((event) => event.status !== "cancelled" && event.startDate >= today)
    .slice(0, 3)
    .map((event) => {
      const identity = resolveScheduleIdentity(event);
      return {
        id: event.id,
        name: displayOpponentOrEvent(event),
        date: event.startDate,
        location: event.locationText ?? event.venueName ?? "Location TBD",
        logoSrc: identity.logoSrc,
        initials: identity.initials,
      };
    });
  return (
    <HomeDashboard
      elo={elo}
      matches={matches}
      interactions={recentInteractions(interactions, 5)}
      visits={upcomingVisits(directory.rows, { limit: 3 })}
      utrResults={utrResults}
      monthRule={currentMonth ? { label: currentMonth.label, used: currentMonth.used, budget: currentMonth.budget } : null}
      events={events}
    />
  );
}
