import { notFound } from "next/navigation";

import RecruitingPersonWorkspace from "@/features/recruiting/components/RecruitingPersonWorkspace";
import { getRecruitWorkspaceRecord } from "@/features/recruiting/directory";
import { listRecruitInteractions } from "@/features/interactions/repository";
import { listTournaments } from "@/features/tournaments/repository";

export const dynamic = "force-dynamic";

export default async function RecruitingPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { id } = await params;
  const { workspace } = await searchParams;
  const [record, interactions, tournamentsResult] = await Promise.all([
    getRecruitWorkspaceRecord(id), listRecruitInteractions(id), listTournaments(),
  ]);

  if (!record) {
    notFound();
  }

  return (
    <RecruitingPersonWorkspace
      person={record.person}
      profile={record.profile}
      analytics={record.analytics}
      inCurrentCohort={record.inCurrentCohort}
      interactions={interactions}
      tournamentOptions={(tournamentsResult.ok ? tournamentsResult.tournaments : []).map((item) => ({ id: item.id, label: item.name }))}
      initialWorkspaceId={workspace}
    />
  );
}
