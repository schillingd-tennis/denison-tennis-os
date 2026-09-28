import { listPeople } from "@/features/people/repository";
import PeopleDirectory from "@/features/people/components/PeopleDirectory";
import { buildPlayerAcademicSummaries } from "@/features/teamGrades/calculations";
import { listAcademicRecords, listAcademicTerms } from "@/features/teamGrades/repository";

export const dynamic = "force-dynamic";

export default async function PlayersCoachesPage() {
  const [people, termsResult, recordsResult] = await Promise.all([
    listPeople(),
    listAcademicTerms().catch(() => []),
    listAcademicRecords().catch(() => []),
  ]);
  return <PeopleDirectory people={people} academicSummaries={buildPlayerAcademicSummaries(termsResult, recordsResult)} />;
}
