import InteractionsDashboard from "@/features/interactions/components/InteractionsDashboard";
import { listRecruitInteractions } from "@/features/interactions/repository";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import { listTournaments } from "@/features/tournaments/repository";
import { getDisplayName, getHometown } from "@/features/people/utils";
export const dynamic = "force-dynamic";
export default async function InteractionsPage(){
  const [interactions,directory,tournamentResult]=await Promise.all([listRecruitInteractions(),loadRecruitingDirectory(),listTournaments()]);
  return <InteractionsDashboard interactions={interactions} recruits={directory.rows.map((row)=>({
    id: row.person.id,
    label: getDisplayName(row.person),
    firstName: row.person.firstName,
    lastName: row.person.lastName,
    preferredName: row.person.preferredName,
    classYear: row.profile.recruitClassYear ?? null,
    hometown: getHometown(row.person) ?? null,
  }))} tournaments={(tournamentResult.ok?tournamentResult.tournaments:[]).map(x=>({id:x.id,label:x.name}))}/>;
}
