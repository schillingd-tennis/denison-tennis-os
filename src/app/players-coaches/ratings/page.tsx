import TeamRatingsWorkspace from "@/features/teamRatings/components/TeamRatingsWorkspace";
import { getLatestTeamPower6, listTeamRatingDashboard } from "@/features/teamRatings/repository";

export const dynamic = "force-dynamic";

export default async function TeamRatingsPage() {
  let rows: Awaited<ReturnType<typeof listTeamRatingDashboard>> = [];
  let power6: number | null = null;
  let loadError: string | null = null;
  try {
    [rows, power6] = await Promise.all([
      listTeamRatingDashboard(),
      getLatestTeamPower6(),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load team ratings.";
  }
  return <TeamRatingsWorkspace rows={rows} power6={power6} loadError={loadError} />;
}
