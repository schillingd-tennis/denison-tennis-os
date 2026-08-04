import { people } from "@/features/people/data";
import TeamDirectory from "@/features/team/components/TeamDirectory";

export default function TeamPage() {
  return <TeamDirectory people={people} />;
}
