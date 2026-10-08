import RecruitRatingsWorkspace from "@/features/recruitRatings/components/RecruitRatingsWorkspace";
import { listRecruitRatingDashboard } from "@/features/recruitRatings/repository";

export const dynamic = "force-dynamic";

export default async function RecruitRatingsPage() {
  let rows: Awaited<ReturnType<typeof listRecruitRatingDashboard>> = [];
  let loadError: string | null = null;
  try {
    rows = await listRecruitRatingDashboard();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load weekly recruit rating changes.";
  }
  return <RecruitRatingsWorkspace rows={rows} loadError={loadError} />;
}
