import { listPeople } from "@/features/people/repository";
import PeopleDirectory from "@/features/people/components/PeopleDirectory";
import {
  getLatestTeamPower6,
  listTeamPower6History,
} from "@/features/teamRatings/repository";

export const dynamic = "force-dynamic";

export default async function PlayersCoachesPage() {
  const [people, power6, power6History] = await Promise.all([
    listPeople(),
    getLatestTeamPower6().catch(() => null),
    listTeamPower6History(10).catch(() => []),
  ]);
  return (
    <PeopleDirectory
      people={people}
      power6={power6}
      power6History={power6History}
    />
  );
}
