import { listPeople } from "@/features/people/repository";
import PeopleDirectory from "@/features/people/components/PeopleDirectory";

// People live in Supabase (BP-015) — always render with the current table
// contents rather than a build-time snapshot. Route stays /team (BP-021).
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const people = await listPeople();
  return <PeopleDirectory people={people} />;
}
