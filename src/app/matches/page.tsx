import MatchesWorkspace from "@/features/matches/components/MatchesWorkspace";
import { parseMatchesTab } from "@/features/matches/display";
import { loadMatchesWorkspaceData } from "@/features/matches/loadWorkspace";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    import?: string;
    scheduleEventId?: string;
    method?: string;
  }>;
}) {
  const {
    tab: tabParam,
    import: importParam,
    scheduleEventId,
    method,
  } = await searchParams;
  const tab = parseMatchesTab(tabParam);
  const { events, results, roster, scheduleById, loadError } = await loadMatchesWorkspaceData();

  return (
    <MatchesWorkspace
      events={events}
      results={results}
      roster={roster}
      scheduleById={scheduleById}
      tab={tab}
      loadError={loadError}
      initialImportOpen={importParam === "1"}
      initialScheduleEventId={scheduleEventId ?? null}
      initialEntryMethod={method === "manual" ? "manual" : "paste"}
    />
  );
}
