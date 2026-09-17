import MatchPairDetail from "@/features/matches/components/MatchPairDetail";
import { loadMatchesWorkspaceData } from "@/features/matches/loadWorkspace";

export const dynamic = "force-dynamic";

export default async function MatchPairPage({
  params,
}: {
  params: Promise<{ pairKey: string }>;
}) {
  const { pairKey: encoded } = await params;
  const pairKey = decodeURIComponent(encoded);
  const { events, results, roster, loadError } = await loadMatchesWorkspaceData();

  return (
    <>
      {loadError ? (
        <p className="m-4 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      ) : null}
      <MatchPairDetail pairKey={pairKey} events={events} results={results} roster={roster} />
    </>
  );
}
