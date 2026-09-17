"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import {
  AdaptiveWorkspace,
  type AdaptiveWorkspaceDefinition,
} from "@/components/adaptive-workspace";
import { SaveIndicator, useSaveIndicator } from "@/components/inline-edit";
import { MobileWorkspaceSelector } from "@/components/mobile-workspace";
import {
  PersonWorkspaceDesktopSplit,
  PersonWorkspaceMobilePane,
  PersonWorkspaceShell,
} from "@/components/person-workspace-shell";
import {
  matchesEventPath,
  matchesImportPath,
  TEAM_OPERATIONS_SCHEDULE_ROUTE,
  teamOperationsScheduleEventPath,
} from "@/lib/module-routes";

import type { ScheduleEventPlanningBundle, ScheduleRosterCandidate } from "../eventPlanningTypes";
import type { TeamScheduleEvent } from "../types";
import {
  parseScheduleEventWorkspaceId,
  type ScheduleEventWorkspaceId,
} from "../workspaces";
import { ScheduleEventFieldSession } from "./ScheduleEventFieldSession";
import {
  ScheduleEventWorkspaceNav,
  ScheduleEventWorkspaceProfile,
  scheduleEventWorkspaceItems,
} from "./ScheduleEventWorkspaceChrome";
import {
  AlumniAttendingWorkspace,
  EventDetailsWorkspace,
  EventTravelWorkspace,
  PackingListWorkspace,
  PlanningNotesWorkspace,
  PracticeMatchTimesWorkspace,
  TeamsInvolvedWorkspace,
  TravelingPartyWorkspace,
} from "./ScheduleEventWorkspaceSections";

export default function ScheduleEventWorkspace({
  event: initialEvent,
  planning: initialPlanning,
  roster,
  alumniCandidates,
  officialMatchEventId = null,
  officialResultsHref = null,
  officialResultsLabel = null,
  resultsStatusLabel = null,
  initialWorkspace = "event-details",
}: {
  event: TeamScheduleEvent;
  planning: ScheduleEventPlanningBundle;
  roster: ScheduleRosterCandidate[];
  alumniCandidates: ScheduleRosterCandidate[];
  /** Existing Matches container for this Schedule event — never create empty on view. */
  officialMatchEventId?: string | null;
  officialResultsHref?: string | null;
  officialResultsLabel?: string | null;
  resultsStatusLabel?: string | null;
  initialWorkspace?: ScheduleEventWorkspaceId;
}) {
  const router = useRouter();
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();
  const [event, setEvent] = useState(initialEvent);
  const [planning, setPlanning] = useState(initialPlanning);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(initialWorkspace);

  if (initialEvent.id !== event.id) {
    setEvent(initialEvent);
    setPlanning(initialPlanning);
    setActiveWorkspaceId(initialWorkspace);
  }

  function selectWorkspace(id: string) {
    setActiveWorkspaceId(id);
    const workspace = parseScheduleEventWorkspaceId(id);
    router.replace(`${teamOperationsScheduleEventPath(event.id)}?workspace=${workspace}`, {
      scroll: false,
    });
  }

  const navItems = scheduleEventWorkspaceItems(event, planning);
  const resolvedId = navItems.some((item) => item.id === activeWorkspaceId)
    ? activeWorkspaceId
    : "event-details";

  const adaptiveWorkspaces: AdaptiveWorkspaceDefinition[] = [
    {
      id: "event-details",
      title: "Event Details",
      subtitle: "Schedule info, venue, and status",
      content: <EventDetailsWorkspace />,
    },
    {
      id: "traveling-party",
      title: "Traveling Party",
      subtitle: "Players, coaches, and additional travelers",
      content: (
        <TravelingPartyWorkspace
          eventId={event.id}
          party={planning.party}
          roster={roster}
          onPartyChange={(party) => setPlanning((current) => ({ ...current, party }))}
          runSave={runSave}
        />
      ),
    },
    {
      id: "teams-involved",
      title: "Teams Involved",
      subtitle: "Schools competing or attending",
      content: (
        <TeamsInvolvedWorkspace
          eventId={event.id}
          teams={planning.teams}
          onTeamsChange={(teams) => setPlanning((current) => ({ ...current, teams }))}
          runSave={runSave}
        />
      ),
    },
    {
      id: "travel",
      title: "Travel",
      subtitle: "Vans, flights, buses, and transfers",
      content: (
        <EventTravelWorkspace
          eventId={event.id}
          travel={planning.travel}
          party={planning.party}
          onTravelChange={(travel) => setPlanning((current) => ({ ...current, travel }))}
          runSave={runSave}
        />
      ),
    },
    {
      id: "practice-match-times",
      title: "Practice & Match Times",
      subtitle: "Dated sessions for this event",
      content: (
        <PracticeMatchTimesWorkspace
          eventId={event.id}
          sessions={planning.sessions}
          primaryTime={event.timeText}
          onSessionsChange={(sessions) => setPlanning((current) => ({ ...current, sessions }))}
          runSave={runSave}
        />
      ),
    },
    {
      id: "alumni-attending",
      title: "Alumni Attending",
      subtitle: "Alumni and manual guests",
      content: (
        <AlumniAttendingWorkspace
          eventId={event.id}
          alumni={planning.alumni}
          alumniCandidates={alumniCandidates}
          onAlumniChange={(alumni) => setPlanning((current) => ({ ...current, alumni }))}
          runSave={runSave}
        />
      ),
    },
    {
      id: "packing-list",
      title: "Packing List",
      subtitle: "Trip checklist",
      content: (
        <PackingListWorkspace
          eventId={event.id}
          packing={planning.packing}
          onPackingChange={(packing) => setPlanning((current) => ({ ...current, packing }))}
          runSave={runSave}
        />
      ),
    },
    {
      id: "planning",
      title: "Planning",
      subtitle: "Working notes for this event",
      content: (
        <PlanningNotesWorkspace
          eventId={event.id}
          notes={planning.planning.notes}
          onNotesChange={(notes, updatedAt) =>
            setPlanning((current) => ({
              ...current,
              planning: { eventId: event.id, notes, updatedAt },
            }))
          }
          runSave={runSave}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 max-md:min-w-0 max-md:overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={TEAM_OPERATIONS_SCHEDULE_ROUTE}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Schedule
        </Link>
        <SaveIndicator status={saveStatus} error={saveError} />
      </div>

      <ScheduleEventWorkspaceProfile
        event={event}
        officialResultsHref={
          officialResultsHref ??
          (officialMatchEventId
            ? matchesEventPath(officialMatchEventId)
            : matchesImportPath(event.id))
        }
        officialResultsLabel={
          officialResultsLabel ??
          (officialMatchEventId ? "Official Results" : "Import Official Results")
        }
        resultsStatusLabel={resultsStatusLabel}
      />

      <ScheduleEventFieldSession event={event} onEventChange={setEvent} runSave={runSave}>
        <PersonWorkspaceShell
          mobile={
            <PersonWorkspaceMobilePane>
              <MobileWorkspaceSelector
                items={navItems.map((item) => ({
                  id: item.id,
                  title: item.title,
                  icon: item.icon,
                  lines: item.descriptor ? [item.descriptor] : [],
                }))}
                activeId={resolvedId}
                onSelect={selectWorkspace}
              />
              <AdaptiveWorkspace activeId={resolvedId} workspaces={adaptiveWorkspaces} />
            </PersonWorkspaceMobilePane>
          }
          desktop={
            <PersonWorkspaceDesktopSplit
              nav={
                <ScheduleEventWorkspaceNav
                  items={navItems}
                  activeId={resolvedId}
                  onSelect={selectWorkspace}
                />
              }
              content={
                <AdaptiveWorkspace
                  framed={false}
                  activeId={resolvedId}
                  workspaces={adaptiveWorkspaces}
                />
              }
            />
          }
        />
      </ScheduleEventFieldSession>
    </div>
  );
}
