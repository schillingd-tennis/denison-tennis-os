import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import RecruitingDirectory from "@/features/recruiting/components/RecruitingDirectory";

export const dynamic = "force-dynamic";

export default async function RecruitingListPage() {
  const { rows, denisonCommits } = await loadRecruitingDirectory();
  return <RecruitingDirectory rows={rows} denisonCommits={denisonCommits} />;
}
