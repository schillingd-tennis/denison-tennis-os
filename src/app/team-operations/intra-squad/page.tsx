import IntraSquadWorkspace from "@/features/intraSquad/components/IntraSquadWorkspace";
import { parseIntraSquadTab } from "@/features/intraSquad/display";
import { loadIntraSquadWorkspaceData } from "@/features/intraSquad/loadWorkspace";

export const dynamic = "force-dynamic";

export default async function IntraSquadPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = parseIntraSquadTab(tabParam);
  const { matches, roster, loadError } = await loadIntraSquadWorkspaceData();

  return <IntraSquadWorkspace matches={matches} roster={roster} tab={tab} loadError={loadError} />;
}
