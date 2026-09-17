import MatchPlayerDetail from "@/features/matches/components/MatchPlayerDetail";
import { loadMatchesWorkspaceData } from "@/features/matches/loadWorkspace";

export const dynamic = "force-dynamic";

export default async function MatchPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { personId } = await params;
  const { view } = await searchParams;
  const { events, results, roster, loadError } = await loadMatchesWorkspaceData();

  return (
    <>
      {loadError ? (
        <p className="m-4 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      ) : null}
      <MatchPlayerDetail
        playerId={personId}
        events={events}
        results={results}
        roster={roster}
        view={view === "doubles" ? "doubles" : "singles"}
      />
    </>
  );
}
