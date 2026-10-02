import RecruitingDashboard from "@/features/recruiting/components/RecruitingDashboard";
import RecruitingAddRecruitButton from "@/features/recruiting/components/RecruitingAddRecruitButton";
import RecruitingCommandTabs, {
  type RecruitingCommandTab,
} from "@/features/recruiting/components/RecruitingCommandTabs";
import ModulePageShell from "@/components/ModulePageShell";
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
import TodayBetaPage from "@/features/recruiting/todayBeta/components/TodayBetaPage";
import { loadTodayBetaPageData } from "@/features/recruiting/todayBeta/repository";

export const dynamic = "force-dynamic";

const COMMAND_TABS = new Set<RecruitingCommandTab>([
  "overview",
  "results",
  "follow-ups",
  "monitoring",
]);

export default async function RecruitingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const requestedTab = (await searchParams).tab;
  const activeTab: RecruitingCommandTab = COMMAND_TABS.has(requestedTab as RecruitingCommandTab)
    ? (requestedTab as RecruitingCommandTab)
    : "overview";
  const now = new Date();
  const [interactions, directory, tournamentResult, recentChangeLogs, apple, todayBeta] = await Promise.all([
    listVisibleRecruitingInteractions(),
    loadRecruitingDirectory(),
    listTournaments(),
    listRecentRecruitChangeLog(),
    getAppleMessagesSyncStatusAction(),
    loadTodayBetaPageData(),
  ]);
  const tournaments = tournamentResult.ok ? tournamentResult.tournaments : [];
  const commits = denisonCommitSummary(directory.denisonCommitRecruits);
  const visits = upcomingVisits(directory.rows);
  const alertEligibleIds = communicationAlertEligibleIds(directory.rows);
  const alerts = dashboardCommunicationAlerts(interactions, alertEligibleIds, now);

  const dashboard = (
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
      recentResults={todayBeta.newResults}
      embedded
    />
  );

  return (
    <ModulePageShell
      title="Recruiting Command Center"
      subtitle="Pipeline, live results, visits, follow-ups, and monitoring in one workspace"
      actions={<RecruitingAddRecruitButton />}
    >
      <div className="flex flex-col gap-4">
        <RecruitingCommandTabs active={activeTab} />
        {activeTab === "overview" ? dashboard : null}
        {activeTab === "results" ? <TodayBetaPage data={todayBeta} embedded view="results" /> : null}
        {activeTab === "follow-ups" ? (
          <TodayBetaPage data={todayBeta} embedded view="follow-ups" />
        ) : null}
        {activeTab === "monitoring" ? (
          <TodayBetaPage data={todayBeta} embedded view="monitoring" />
        ) : null}
      </div>
    </ModulePageShell>
  );
}
