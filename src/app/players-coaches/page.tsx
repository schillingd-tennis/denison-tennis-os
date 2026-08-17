import { listPeople } from "@/features/people/repository";
import PeopleDirectory from "@/features/people/components/PeopleDirectory";

export const dynamic = "force-dynamic";

export default async function PlayersCoachesPage() {
  const people = await listPeople();
  return <PeopleDirectory people={people} />;
}
