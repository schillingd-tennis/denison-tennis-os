import ScoutingWorkspace from "@/features/scouting/components/ScoutingWorkspace";
import {
  listDirectReports,
  listFormLinks,
  listFormSubmissions,
  listOpponentPlayers,
  listScoutingTeams,
} from "@/features/scouting/repository";

export const dynamic = "force-dynamic";

export default async function ScoutingPage() {
  let teams: Awaited<ReturnType<typeof listScoutingTeams>> = [];
  let players: Awaited<ReturnType<typeof listOpponentPlayers>> = [];
  let reports: Awaited<ReturnType<typeof listDirectReports>> = [];
  let submissions: Awaited<ReturnType<typeof listFormSubmissions>> = [];
  let formLinks: Awaited<ReturnType<typeof listFormLinks>> = [];
  let loadError: string | null = null;

  try {
    [teams, players, reports, submissions, formLinks] = await Promise.all([
      listScoutingTeams(),
      listOpponentPlayers(),
      listDirectReports(),
      listFormSubmissions(),
      listFormLinks(),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load scouting.";
  }

  return (
    <ScoutingWorkspace
      teams={teams}
      players={players}
      reports={reports}
      submissions={submissions}
      formLinks={formLinks}
      loadError={loadError}
    />
  );
}
