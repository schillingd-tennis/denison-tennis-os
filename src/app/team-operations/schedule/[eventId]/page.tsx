import { notFound } from "next/navigation";

import { getMatchEventByScheduleId, listMatchResults } from "@/features/matches/repository";
import {
  deriveResultsStatus,
  hasResultsEntryWork,
  RESULTS_STATUS_LABELS,
} from "@/features/matches/teamCompetitions";
import { listPeople } from "@/features/people/repository";
import ScheduleEventWorkspace from "@/features/teamSchedule/components/ScheduleEventWorkspace";
import {
  buildAlumniCandidates,
  buildScheduleRosterCandidates,
  loadScheduleEventPlanning,
  seedTeamsFromEvent,
} from "@/features/teamSchedule/eventPlanningRepository";
import { getScheduleEvent } from "@/features/teamSchedule/repository";
import { parseScheduleEventWorkspaceId } from "@/features/teamSchedule/workspaces";
import { matchesEventPath, matchesImportPath } from "@/lib/module-routes";

/**
 * Schedule event Adaptive Workspace.
 * Directory season / filters / view restore via session storage on Back to Schedule.
 */
export const dynamic = "force-dynamic";

export default async function ScheduleEventWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { eventId } = await params;
  const { workspace } = await searchParams;
  const event = await getScheduleEvent(eventId);
  if (!event) notFound();

  const [people, planning, officialMatch] = await Promise.all([
    listPeople(),
    loadScheduleEventPlanning(event.id),
    getMatchEventByScheduleId(event.id),
  ]);

  const resultCount = officialMatch
    ? (await listMatchResults(officialMatch.id)).length
    : 0;

  const resultsStatus = deriveResultsStatus({
    schedule: event,
    matchEvent: officialMatch,
    resultCount,
  });

  let officialResultsHref: string;
  let officialResultsLabel: string;
  if (resultsStatus === "complete" && officialMatch) {
    officialResultsHref = matchesEventPath(officialMatch.id);
    officialResultsLabel = "View Results";
  } else if (
    resultsStatus === "partial" ||
    (officialMatch && hasResultsEntryWork(officialMatch, resultCount))
  ) {
    officialResultsHref = matchesImportPath(event.id);
    officialResultsLabel = "Continue Entry";
  } else {
    officialResultsHref = matchesImportPath(event.id);
    officialResultsLabel = "Enter Results";
  }

  const teams =
    planning.teams.length > 0 ? planning.teams : await seedTeamsFromEvent(event);

  return (
    <ScheduleEventWorkspace
      key={event.id}
      event={event}
      planning={{ ...planning, teams }}
      roster={buildScheduleRosterCandidates(people)}
      alumniCandidates={buildAlumniCandidates(people)}
      officialMatchEventId={officialMatch?.id ?? null}
      officialResultsHref={officialResultsHref}
      officialResultsLabel={officialResultsLabel}
      resultsStatusLabel={RESULTS_STATUS_LABELS[resultsStatus]}
      initialWorkspace={parseScheduleEventWorkspaceId(workspace)}
    />
  );
}
