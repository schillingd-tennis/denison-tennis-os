import PracticeDashboard from "@/features/practice/components/PracticeDashboard";
import { getDayRuleSummary, listDailyPracticePlans, listPracticeCompetitionDates, listPracticeDrills } from "@/features/practice/repository";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  let drills: Awaited<ReturnType<typeof listPracticeDrills>> = [];
  let competitionDates: Awaited<ReturnType<typeof listPracticeCompetitionDates>> = [];
  let loadError: string | null = null;
  let dayRule = await getDayRuleSummary();
  let plans: Awaited<ReturnType<typeof listDailyPracticePlans>> = [];
  try {
    [drills, competitionDates, dayRule, plans] = await Promise.all([
      listPracticeDrills(),
      listPracticeCompetitionDates(),
      getDayRuleSummary(),
      listDailyPracticePlans(),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load Practice.";
  }
  return <PracticeDashboard drills={drills} competitionDates={competitionDates} dayRule={dayRule} plans={plans} loadError={loadError} />;
}
