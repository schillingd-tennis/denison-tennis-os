import TeamScheduleDashboard from "@/features/teamSchedule/components/TeamScheduleDashboard";
import { DEFAULT_SEASON_YEAR } from "@/features/teamSchedule/seedData";
import { listScheduleEvents, listSeasonYears } from "@/features/teamSchedule/repository";

export const dynamic = "force-dynamic";

export default async function TeamSchedulePage() {
  let events: Awaited<ReturnType<typeof listScheduleEvents>> = [];
  let seasonYears: number[] = [];
  let loadError: string | null = null;

  try {
    events = await listScheduleEvents();
    seasonYears = await listSeasonYears();
    const seasonYear = seasonYears[0] ?? DEFAULT_SEASON_YEAR;
    return (
      <TeamScheduleDashboard
        events={events}
        seasonYears={seasonYears.length > 0 ? seasonYears : [DEFAULT_SEASON_YEAR]}
        initialSeasonYear={seasonYear}
      />
    );
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load schedule.";
    return (
      <TeamScheduleDashboard
        events={[]}
        seasonYears={[DEFAULT_SEASON_YEAR]}
        initialSeasonYear={DEFAULT_SEASON_YEAR}
        loadError={loadError}
      />
    );
  }
}
