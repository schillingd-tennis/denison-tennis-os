import { listPeople } from "@/features/people/repository";
import TeamDirectory from "@/features/team/components/TeamDirectory";

// The roster now lives in Supabase (BP-015) — always render with the
// current table contents rather than a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const people = await listPeople();
  return <TeamDirectory people={people} />;
}
