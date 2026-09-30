import TeamRatingsWorkspace from "@/features/teamRatings/components/TeamRatingsWorkspace";
import { listTeamRatingDashboard } from "@/features/teamRatings/repository";

export const dynamic = "force-dynamic";

export default async function TeamRatingsPage() {
  let rows: Awaited<ReturnType<typeof listTeamRatingDashboard>> = [];
  let loadError: string | null = null;
  try {
    rows = await listTeamRatingDashboard();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load team ratings.";
  }
  return <TeamRatingsWorkspace rows={rows} loadError={loadError} />;
}
