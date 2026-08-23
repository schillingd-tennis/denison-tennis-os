import { notFound } from "next/navigation";

import TournamentWorkspace from "@/features/tournaments/components/TournamentWorkspace";
import { getTournament } from "@/features/tournaments/repository";
import { parseTournamentWorkspaceId } from "@/features/tournaments/workspaces";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";

export const dynamic = "force-dynamic";

export default async function TournamentWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { tournamentId } = await params;
  const { workspace } = await searchParams;
  const [tournament, directory] = await Promise.all([
    getTournament(tournamentId),
    loadRecruitingDirectory(),
  ]);

  if (!tournament) notFound();

  return (
    <TournamentWorkspace
      key={tournament.id}
      tournament={tournament}
      recruits={directory.rows}
      initialWorkspace={parseTournamentWorkspaceId(workspace)}
    />
  );
}
