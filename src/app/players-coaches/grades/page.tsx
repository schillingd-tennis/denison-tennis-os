import { ROLE_KEYS } from "@/features/lookups/seed";
import { listPeople } from "@/features/people/repository";
import TeamGradesWorkspace from "@/features/teamGrades/components/TeamGradesWorkspace";
import { listAcademicRecords, listAcademicTerms } from "@/features/teamGrades/repository";

export const dynamic = "force-dynamic";

export default async function TeamGradesPage() {
  let loadError: string | null = null;
  let terms: Awaited<ReturnType<typeof listAcademicTerms>> = [];
  let records: Awaited<ReturnType<typeof listAcademicRecords>> = [];
  const people = (await listPeople()).filter((person) => person.role.key === ROLE_KEYS.player);
  try {
    [terms, records] = await Promise.all([listAcademicTerms(), listAcademicRecords()]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load grade data.";
  }
  return <TeamGradesWorkspace people={people} terms={terms} records={records} loadError={loadError} />;
}
