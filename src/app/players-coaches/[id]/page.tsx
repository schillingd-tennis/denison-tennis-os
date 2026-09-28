import { notFound, redirect } from "next/navigation";

import { ROLE_KEYS } from "@/features/lookups/seed";
import { buildDoublesPlayerRecords, buildSinglesPlayerRecords } from "@/features/matches/records";
import { listMatchEvents, listMatchResults } from "@/features/matches/repository";
import { formatRecord } from "@/features/matches/scoringRules";
import PersonWorkspace from "@/features/people/components/PersonWorkspace";
import { listRelationshipsByRelatedPerson } from "@/features/people/personRelationships";
import { getPersonById } from "@/features/people/repository";
import { hasRole, isFamilyPerson, isTeamDirectoryPerson } from "@/features/people/utils";
import { getRecruitProfileByPersonId } from "@/features/recruiting";
import { recruitingPersonPath } from "@/lib/module-routes";
import { buildPlayerAcademicSummaries } from "@/features/teamGrades/calculations";
import { listAcademicRecords, listAcademicTerms } from "@/features/teamGrades/repository";

/**
 * Player/coach workspace route. Directory state (search / filters / sort / view)
 * is restored via session storage when returning to `/players-coaches`.
 */
export const dynamic = "force-dynamic";

export default async function PlayersCoachesWorkspacePage(
  props: PageProps<"/players-coaches/[id]">,
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const person = await getPersonById(id);

  if (!person) {
    notFound();
  }

  if (hasRole(person, ROLE_KEYS.recruit) && !isTeamDirectoryPerson(person)) {
    redirect(recruitingPersonPath(id));
  }

  const recruitProfile = isFamilyPerson(person)
    ? null
    : await getRecruitProfileByPersonId(id);

  const [eventsResult, resultsResult] = hasRole(person, ROLE_KEYS.player)
    ? await Promise.allSettled([listMatchEvents(), listMatchResults()])
    : [null, null];
  const matchDataAvailable =
    eventsResult?.status === "fulfilled" && resultsResult?.status === "fulfilled";
  const singles = matchDataAvailable
    ? buildSinglesPlayerRecords(resultsResult.value, eventsResult.value).find(
        (record) => record.playerId === id,
      )
    : undefined;
  const doubles = matchDataAvailable
    ? buildDoublesPlayerRecords(resultsResult.value, eventsResult.value).find(
        (record) => record.playerId === id,
      )
    : undefined;
  const [academicTerms, academicRecords] = await Promise.all([
    listAcademicTerms().catch(() => []),
    listAcademicRecords().catch(() => []),
  ]);
  const academicSummary = buildPlayerAcademicSummaries(academicTerms, academicRecords)[id];

  const rawFromPlayer =
    typeof searchParams.fromPlayer === "string" ? searchParams.fromPlayer.trim() : "";
  let fromPlayerId: string | undefined;

  if (isFamilyPerson(person) && rawFromPlayer && rawFromPlayer !== person.id) {
    const origin = await getPersonById(rawFromPlayer);
    if (origin && hasRole(origin, ROLE_KEYS.player)) {
      const edges = await listRelationshipsByRelatedPerson(person.id);
      const isRelated = edges.some((edge) => edge.personId === origin.id);
      if (isRelated) {
        fromPlayerId = origin.id;
      }
    }
  }

  return (
    <PersonWorkspace
      person={person}
      fromPlayerId={fromPlayerId}
      recruitClassYear={recruitProfile?.recruitClassYear}
      singlesRecord={matchDataAvailable ? (singles ? formatRecord(singles) : "0–0") : undefined}
      doublesRecord={matchDataAvailable ? (doubles ? formatRecord(doubles) : "0–0") : undefined}
      academicSummary={academicSummary}
    />
  );
}
