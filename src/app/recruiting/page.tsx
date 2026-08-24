import RecruitingDashboard from "@/features/recruiting/components/RecruitingDashboard";
import {
  denisonCommitSummary,
  recentInteractions,
  topRankedRecruits,
  upcomingTournaments,
  upcomingVisits,
} from "@/features/recruiting/dashboard";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import { listRecruitInteractions } from "@/features/interactions/repository";
import { getDisplayName } from "@/features/people/utils";
import { listTournaments } from "@/features/tournaments/repository";

export const dynamic = "force-dynamic";

export default async function RecruitingPage() {
  const [interactions, directory, tournamentResult] = await Promise.all([
    listRecruitInteractions(),
    loadRecruitingDirectory(),
    listTournaments(),
  ]);
  const tournaments = tournamentResult.ok ? tournamentResult.tournaments : [];
  const commits = denisonCommitSummary(directory.denisonCommitRecruits);

  return (
    <RecruitingDashboard
      recentInteractions={recentInteractions(interactions)}
      interactionRecruits={directory.rows.map((row) => ({
        id: row.person.id,
        label: getDisplayName(row.person),
        firstName: row.person.firstName,
        lastName: row.person.lastName,
        preferredName: row.person.preferredName,
        classYear: row.profile.recruitClassYear ?? null,
      }))}
      interactionTournaments={tournaments.map((tournament) => ({
        id: tournament.id,
        label: tournament.name,
      }))}
      topRanked={topRankedRecruits(directory.rows)}
      upcomingTournaments={upcomingTournaments(tournaments)}
      upcomingVisits={upcomingVisits(directory.rows)}
      commits={commits.recruits}
    />
  );
}
