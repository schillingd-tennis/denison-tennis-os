import { notFound } from "next/navigation";

import MatchEventWorkspace from "@/features/matches/components/MatchEventWorkspace";
import { loadMatchEventWorkspaceData } from "@/features/matches/loadWorkspace";
import { parseMatchEventWorkspaceId } from "@/features/matches/workspaces";
import { MATCHES_ROUTE } from "@/lib/module-routes";

export const dynamic = "force-dynamic";

export default async function MatchEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ workspace?: string; from?: string }>;
}) {
  const { eventId } = await params;
  const { workspace, from } = await searchParams;
  const data = await loadMatchEventWorkspaceData(eventId);
  if (!data.event) notFound();

  return (
    <MatchEventWorkspace
      event={data.event}
      results={data.results}
      imports={data.imports}
      roster={data.roster}
      schedule={data.schedule}
      initialWorkspace={parseMatchEventWorkspaceId(workspace)}
      backHref={from === "results" ? `${MATCHES_ROUTE}?tab=results` : MATCHES_ROUTE}
    />
  );
}
