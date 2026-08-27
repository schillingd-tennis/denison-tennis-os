import RecruitingDashboard from "@/features/recruiting/components/RecruitingDashboard";
import {
  activeRecruitCount,
  communicationAlertEligibleIds,
  dashboardCommunicationAlerts,
  dashboardKpis,
  dashboardNeedsAttentionCount,
  dashboardPriorities,
  denisonCommitSummary,
  newMessagesFromSync,
  pipelineSnapshot,
  recentInteractions,
  topRankedRecruits,
  upcomingTournaments,
  upcomingVisits,
  visitsNext30DaysCount,
} from "@/features/recruiting/dashboard";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import { listRecentRecruitChangeLog } from "@/features/recruiting/changeLog/repository";
import { listVisibleRecruitingInteractions } from "@/features/interactions/repository";
import { getAppleMessagesSyncStatusAction } from "@/features/interactions/appleMessagesSync/actions";
import { getDisplayName } from "@/features/people/utils";
import { listTournaments } from "@/features/tournaments/repository";

export const dynamic = "force-dynamic";

export default async function RecruitingPage() {
  const now = new Date();
  const [interactions, directory, tournamentResult, recentChangeLogs, apple] = await Promise.all([
    listVisibleRecruitingInteractions(),
    loadRecruitingDirectory(),
    listTournaments(),
    listRecentRecruitChangeLog(),
    getAppleMessagesSyncStatusAction(),
  ]);
  const tournaments = tournamentResult.ok ? tournamentResult.tournaments : [];
  const commits = denisonCommitSummary(directory.denisonCommitRecruits);
  const visits = upcomingVisits(directory.rows);
  const alertEligibleIds = communicationAlertEligibleIds(directory.rows);
  const alerts = dashboardCommunicationAlerts(interactions, alertEligibleIds, now);

  return (
    <RecruitingDashboard
      kpis={dashboardKpis({
        activeRecruits: activeRecruitCount(directory.rows),
        needsAttention: dashboardNeedsAttentionCount(interactions, alertEligibleIds, now),
        visitsNext30Days: visitsNext30DaysCount(directory.rows),
        newTexts: newMessagesFromSync(apple.ok ? apple.status : null),
      })}
      pipeline={pipelineSnapshot(directory.rows)}
      priorities={dashboardPriorities({
        alerts,
        visits,
        rows: directory.rows,
      })}
      alerts={alerts}
      recentChangeLogs={recentChangeLogs}
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
      upcomingVisits={visits}
      commits={commits.recruits}
    />
  );
}
