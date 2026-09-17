import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import { listPeople } from "@/features/people/repository";
import { getScheduleEvent, listScheduleEvents } from "@/features/teamSchedule/repository";
import type { TeamScheduleEvent } from "@/features/teamSchedule/types";

import {
  listImportBatchesForEvent,
  listMatchEvents,
  listMatchResults,
  getMatchEvent,
} from "./repository";
import type { MatchEvent, MatchImportBatch, MatchResult, RosterPlayer } from "./types";

export function peopleToMatchesRoster(
  people: Awaited<ReturnType<typeof listPeople>>,
): RosterPlayer[] {
  return people
    .filter(
      (person) =>
        person.role?.key === ROLE_KEYS.player && person.status?.key === STATUS_KEYS.current,
    )
    .map((person) => ({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      preferredName: person.preferredName,
      classYear: person.classYear,
    }));
}

export async function loadMatchesWorkspaceData(): Promise<{
  events: MatchEvent[];
  results: MatchResult[];
  roster: RosterPlayer[];
  scheduleById: Record<string, TeamScheduleEvent>;
  loadError: string | null;
}> {
  try {
    const [eventsResult, resultsResult, peopleResult, scheduleResult] = await Promise.allSettled([
      listMatchEvents(),
      listMatchResults(),
      listPeople(),
      listScheduleEvents(),
    ]);

    const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
    const results = resultsResult.status === "fulfilled" ? resultsResult.value : [];
    const people = peopleResult.status === "fulfilled" ? peopleResult.value : [];
    const scheduleEvents = scheduleResult.status === "fulfilled" ? scheduleResult.value : [];
    const scheduleById = Object.fromEntries(scheduleEvents.map((e) => [e.id, e]));
    const errors = [eventsResult, resultsResult, peopleResult, scheduleResult]
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

    return {
      events,
      results,
      roster: peopleToMatchesRoster(people),
      scheduleById,
      loadError: errors.length ? errors.join(" · ") : null,
    };
  } catch (error) {
    return {
      events: [],
      results: [],
      roster: [],
      scheduleById: {},
      loadError: error instanceof Error ? error.message : "Failed to load Matches.",
    };
  }
}

export async function loadMatchEventWorkspaceData(eventId: string): Promise<{
  event: MatchEvent | null;
  results: MatchResult[];
  imports: MatchImportBatch[];
  roster: RosterPlayer[];
  schedule: TeamScheduleEvent | null;
  loadError: string | null;
}> {
  try {
    const [event, results, imports, people] = await Promise.all([
      getMatchEvent(eventId),
      listMatchResults(eventId),
      listImportBatchesForEvent(eventId),
      listPeople(),
    ]);
    const schedule =
      event?.scheduleEventId != null ? await getScheduleEvent(event.scheduleEventId) : null;
    return {
      event,
      results,
      imports,
      roster: peopleToMatchesRoster(people),
      schedule,
      loadError: null,
    };
  } catch (error) {
    return {
      event: null,
      results: [],
      imports: [],
      roster: [],
      schedule: null,
      loadError: error instanceof Error ? error.message : "Failed to load event.",
    };
  }
}
