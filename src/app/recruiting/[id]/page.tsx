import { notFound } from "next/navigation";

import RecruitingPersonWorkspace from "@/features/recruiting/components/RecruitingPersonWorkspace";
import { getRecruitWorkspaceRecord } from "@/features/recruiting/directory";
import { listRecruitChangeLogForPerson } from "@/features/recruiting/changeLog/repository";
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
  const [record, interactions, tournamentsResult, changeLogEvents] = await Promise.all([
    getRecruitWorkspaceRecord(id),
    listRecruitInteractions(id),
    listTournaments(),
    listRecruitChangeLogForPerson(id),
  ]);

  if (!record) {
    notFound();
  }

  const tournaments = tournamentsResult.ok ? tournamentsResult.tournaments : [];

  return (
    <RecruitingPersonWorkspace
      person={record.person}
      profile={record.profile}
      analytics={record.analytics}
      inCurrentCohort={record.inCurrentCohort}
      interactions={interactions}
      tournamentOptions={tournaments.map((item) => ({ id: item.id, label: item.name }))}
      recruitTournaments={tournaments
        .filter((tournament) => tournament.linkedRecruits.some((recruit) => recruit.personId === id))
        .map((tournament) => ({
          id: tournament.id,
          name: tournament.name,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          location: tournament.location,
          level: tournament.level,
          lifecycleStatus: tournament.lifecycleStatus,
        }))}
      initialWorkspaceId={workspace}
      changeLogEvents={changeLogEvents}
    />
  );
}
