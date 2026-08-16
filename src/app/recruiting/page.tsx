import { listRecruitDirectoryRows } from "@/features/recruiting/directory";
import RecruitingDirectory from "@/features/recruiting/components/RecruitingDirectory";

export const dynamic = "force-dynamic";

export default async function RecruitingPage() {
  const rows = await listRecruitDirectoryRows();
  return <RecruitingDirectory rows={rows} />;
}
