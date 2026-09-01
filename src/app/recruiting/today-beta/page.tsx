import TodayBetaPage from "@/features/recruiting/todayBeta/components/TodayBetaPage";
import { loadTodayBetaPageData } from "@/features/recruiting/todayBeta/repository";

export const dynamic = "force-dynamic";

export default async function RecruitingTodayBetaRoutePage() {
  const data = await loadTodayBetaPageData();
  return <TodayBetaPage data={data} />;
}
