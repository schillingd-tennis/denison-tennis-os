import { listPeople } from "@/features/people/repository";
import PeopleDirectory from "@/features/people/components/PeopleDirectory";
import { buildPlayerAcademicSummaries } from "@/features/teamGrades/calculations";
import { listAcademicRecords, listAcademicTerms } from "@/features/teamGrades/repository";
import { getLatestTeamPower6 } from "@/features/teamRatings/repository";

export const dynamic = "force-dynamic";

export default async function PlayersCoachesPage() {
  const [people, termsResult, recordsResult, power6] = await Promise.all([
    listPeople(),
    listAcademicTerms().catch(() => []),
    listAcademicRecords().catch(() => []),
    getLatestTeamPower6().catch(() => null),
  ]);
  return <PeopleDirectory people={people} academicSummaries={buildPlayerAcademicSummaries(termsResult, recordsResult)} power6={power6} />;
}
