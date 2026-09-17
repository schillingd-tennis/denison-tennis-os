"use server";

import { revalidatePath } from "next/cache";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import { listPeople } from "@/features/people/repository";
import {
  listScheduleEvents,
  getScheduleEvent,
} from "@/features/teamSchedule/repository";
import type { TeamScheduleEvent } from "@/features/teamSchedule/types";
import { DEFAULT_SEASON_YEAR } from "@/features/teamSchedule/seedData";
import {
  MATCHES_ROUTE,
  matchesEventPath,
  TEAM_OPERATIONS_SCHEDULE_ROUTE,
  teamOperationsScheduleEventPath,
} from "@/lib/module-routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { hybridImportBoxScore } from "./hybridImport";
import {
  createImportBatch,
  deleteMatchResult,
  getMatchEvent,
  getMatchEventByScheduleId,
  linkMatchEventToSchedule,
  listMatchEvents,
  listMatchResults,
  markImportBatch,
  MatchesRepositoryError,
  saveConfirmedImport,
  saveMatchEvent,
  saveMatchResult,
  markMatchResultsComplete,
  reopenMatchResultsEntry,
} from "./repository";
import {
  flagImportScheduleConflicts,
  matchEventTypeFromSchedule,
  scheduleResultsFormat,
  suggestScheduleLinks,
} from "./scheduleLink";
import type { RosterPlayer } from "./types";
import type { MatchEvent, MatchEventType, MatchResult, MatchesImportDraft } from "./types";
import { validateImportDraft } from "./validateDraft";

function toRoster(people: Awaited<ReturnType<typeof listPeople>>): RosterPlayer[] {
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

export async function listScheduleEventsForMatchesAction(input?: {
  seasonYear?: number | null;
}): Promise<{
  events: TeamScheduleEvent[];
  linkedScheduleIds: string[];
  defaultSeasonYear: number;
  loadError: string | null;
}> {
  try {
    const seasonYear = input?.seasonYear ?? DEFAULT_SEASON_YEAR;
    const [scheduleEvents, matchEvents] = await Promise.all([
      listScheduleEvents(seasonYear),
      listMatchEvents(),
    ]);
    const linkedScheduleIds = matchEvents
      .map((e) => e.scheduleEventId)
      .filter((id): id is string => Boolean(id));
    return {
      events: scheduleEvents,
      linkedScheduleIds,
      defaultSeasonYear: seasonYear,
      loadError: null,
    };
  } catch (error) {
    return {
      events: [],
      linkedScheduleIds: [],
      defaultSeasonYear: DEFAULT_SEASON_YEAR,
      loadError: error instanceof Error ? error.message : "Failed to load Schedule events.",
    };
  }
}

export async function getOfficialResultsForScheduleAction(scheduleEventId: string): Promise<{
  matchEventId: string | null;
}> {
  const event = await getMatchEventByScheduleId(scheduleEventId);
  return { matchEventId: event?.id ?? null };
}

export async function parseMatchesBoxScoreAction(input: {
  text: string;
  forcedType?: MatchEventType | "auto";
  seasonYear?: number | null;
  scheduleEventId?: string | null;
}): Promise<
  | {
      ok: true;
      eventType: MatchEventType;
      needsUserChoice: boolean;
      source: string;
      draft: MatchesImportDraft;
      importBatchId: string;
      detectionReasons: string[];
      scheduleConflicts: ReturnType<typeof flagImportScheduleConflicts>;
      scheduleEvent: TeamScheduleEvent | null;
    }
  | {
      ok: false;
      needsUserChoice: boolean;
      error: string;
      preservedText: string;
      detectionReasons: string[];
      importBatchId?: string;
      scheduleEvent?: TeamScheduleEvent | null;
    }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      needsUserChoice: false,
      error: "Sign in to import match results.",
      preservedText: input.text,
      detectionReasons: [],
    };
  }

  let scheduleEvent: TeamScheduleEvent | null = null;
  let forcedType: MatchEventType | "auto" = input.forcedType ?? "auto";

  if (input.scheduleEventId) {
    scheduleEvent = await getScheduleEvent(input.scheduleEventId);
    if (!scheduleEvent) {
      return {
        ok: false,
        needsUserChoice: false,
        error: "Selected Schedule event was not found.",
        preservedText: input.text,
        detectionReasons: [],
      };
    }
    const format = scheduleResultsFormat(scheduleEvent);
    if (format.ambiguous) {
      return {
        ok: false,
        needsUserChoice: false,
        error: format.reason,
        preservedText: input.text,
        detectionReasons: [],
        scheduleEvent,
      };
    }
    // Schedule type drives results format unless user already forced (should match)
    if (forcedType === "auto") {
      forcedType = format.status;
    } else if (forcedType !== format.status) {
      return {
        ok: false,
        needsUserChoice: false,
        error: `Schedule event is ${format.status}; cannot parse as ${forcedType}. Edit the Schedule event type if it is wrong.`,
        preservedText: input.text,
        detectionReasons: [],
        scheduleEvent,
      };
    }
  }

  const people = await listPeople();
  const roster = toRoster(people);
  const result = await hybridImportBoxScore({
    text: input.text,
    roster,
    forcedType,
    seasonYear: input.seasonYear ?? scheduleEvent?.seasonYear,
    allowAi: true,
  });

  if (!result.ok) {
    let importBatchId: string | undefined;
    try {
      const batch = await createImportBatch({
        eventType: null,
        detectionMethod: "auto",
        sourceText: input.text,
        draftJson: { error: result.error, needsUserChoice: result.needsUserChoice },
        scheduleEventId: input.scheduleEventId,
        createdBy: user.id,
      });
      importBatchId = batch.id;
    } catch {
      // Preserve paste even if batch table missing
    }
    return { ...result, importBatchId, scheduleEvent };
  }

  const detectionMethod =
    forcedType === "dual"
      ? "user_dual"
      : forcedType === "tournament"
        ? "user_tournament"
        : "auto";

  const batch = await createImportBatch({
    eventType: result.eventType,
    detectionMethod,
    sourceText: input.text,
    draftJson: result.draft,
    scheduleEventId: input.scheduleEventId,
    createdBy: user.id,
  });

  const scheduleConflicts = scheduleEvent
    ? flagImportScheduleConflicts(result.draft, scheduleEvent)
    : [];

  return {
    ok: true,
    eventType: result.eventType,
    needsUserChoice: result.needsUserChoice,
    source: result.source,
    draft: result.draft,
    importBatchId: batch.id,
    detectionReasons: result.detectionReasons,
    scheduleConflicts,
    scheduleEvent,
  };
}

export async function confirmMatchesImportAction(input: {
  draft: MatchesImportDraft;
  sourceText: string;
  importBatchId?: string | null;
  scheduleEventId: string;
}): Promise<
  | { ok: true; eventId: string; resultCount: number; skipped: number }
  | {
      ok: false;
      error: string;
      errors?: string[];
      preservedDraft: MatchesImportDraft;
      preservedText: string;
    }
> {
  if (!input.scheduleEventId) {
    return {
      ok: false,
      error: "Select a Schedule event before confirming. New imports must be linked to Schedule.",
      preservedDraft: input.draft,
      preservedText: input.sourceText,
    };
  }

  const schedule = await getScheduleEvent(input.scheduleEventId);
  if (!schedule) {
    return {
      ok: false,
      error: "Schedule event not found.",
      preservedDraft: input.draft,
      preservedText: input.sourceText,
    };
  }

  const format = scheduleResultsFormat(schedule);
  if (format.ambiguous) {
    return {
      ok: false,
      error: format.reason,
      preservedDraft: input.draft,
      preservedText: input.sourceText,
    };
  }
  if (input.draft.kind !== format.status) {
    return {
      ok: false,
      error: `Draft is ${input.draft.kind} but Schedule maps to ${format.status}. Edit Schedule or switch events — paste preserved.`,
      preservedDraft: input.draft,
      preservedText: input.sourceText,
    };
  }

  const validation = validateImportDraft(input.draft, { scheduleLinked: true });
  if (!validation.ok) {
    if (input.importBatchId) {
      await markImportBatch(input.importBatchId, {
        status: "failed",
        scheduleEventId: input.scheduleEventId,
        errorMessage: validation.errors.join("; "),
        draftJson: input.draft,
      }).catch(() => undefined);
    }
    return {
      ok: false,
      error: "Fix review errors before saving.",
      errors: validation.errors,
      preservedDraft: input.draft,
      preservedText: input.sourceText,
    };
  }

  try {
    const saved = await saveConfirmedImport({
      draft: input.draft,
      sourceText: input.sourceText,
      importBatchId: input.importBatchId,
      scheduleEventId: input.scheduleEventId,
    });
    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(saved.event.id));
    revalidatePath(teamOperationsScheduleEventPath(input.scheduleEventId));
    revalidatePath(TEAM_OPERATIONS_SCHEDULE_ROUTE);
    return {
      ok: true,
      eventId: saved.event.id,
      resultCount: saved.results.length,
      skipped: saved.skipped,
    };
  } catch (error) {
    const message =
      error instanceof MatchesRepositoryError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Save failed.";
    return {
      ok: false,
      error: message,
      preservedDraft: input.draft,
      preservedText: input.sourceText,
    };
  }
}

export async function linkMatchEventToScheduleAction(input: {
  matchEventId: string;
  scheduleEventId: string;
  resolveConflict?: "abort" | "merge_into_existing";
}): Promise<
  | { ok: true; eventId: string; mergedFromId?: string }
  | {
      ok: false;
      error: string;
      conflict?: { existingMatchEventId: string; message: string };
    }
> {
  try {
    const result = await linkMatchEventToSchedule(input);
    if (!result.ok) {
      return {
        ok: false,
        error: result.conflict.message,
        conflict: {
          existingMatchEventId: result.conflict.existingMatchEventId,
          message: result.conflict.message,
        },
      };
    }
    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(result.event.id));
    if (result.mergedFromId) {
      revalidatePath(matchesEventPath(result.mergedFromId));
    }
    revalidatePath(teamOperationsScheduleEventPath(input.scheduleEventId));
    return {
      ok: true,
      eventId: result.event.id,
      mergedFromId: result.mergedFromId,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to link Schedule event.",
    };
  }
}

export async function suggestScheduleLinksAction(matchEventId: string): Promise<{
  suggestions: Array<{
    schedule: TeamScheduleEvent;
    score: number;
    reasons: string[];
    alreadyLinked: boolean;
  }>;
  error: string | null;
}> {
  try {
    const event = await getMatchEvent(matchEventId);
    if (!event) return { suggestions: [], error: "Matches event not found." };
    const [scheduleEvents, matchEvents] = await Promise.all([
      listScheduleEvents(event.seasonYear),
      listMatchEvents(),
    ]);
    const linked = new Map(
      matchEvents
        .filter((e) => e.scheduleEventId)
        .map((e) => [e.scheduleEventId!, e.id] as const),
    );
    const suggestions = suggestScheduleLinks(event, scheduleEvents, new Set(linked.keys())).map(
      (s) => ({
        ...s,
        alreadyLinked: linked.has(s.schedule.id) && linked.get(s.schedule.id) !== event.id,
      }),
    );
    // Also include already-linked conflicts that scored well but were filtered
    const conflictCandidates = scheduleEvents
      .filter((s) => linked.has(s.id) && linked.get(s.id) !== event.id)
      .map((schedule) => {
        const scored = suggestScheduleLinks(event, [schedule], new Set());
        return scored[0]
          ? {
              schedule,
              score: scored[0].score,
              reasons: [...scored[0].reasons, "already linked elsewhere"],
              alreadyLinked: true,
            }
          : null;
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    const byId = new Map<string, (typeof suggestions)[number]>();
    for (const s of [...suggestions, ...conflictCandidates]) {
      const prev = byId.get(s.schedule.id);
      if (!prev || s.score > prev.score) byId.set(s.schedule.id, s);
    }
    return {
      suggestions: [...byId.values()].sort((a, b) => b.score - a.score).slice(0, 10),
      error: null,
    };
  } catch (error) {
    return {
      suggestions: [],
      error: error instanceof Error ? error.message : "Failed to suggest links.",
    };
  }
}

export async function saveMatchResultAction(
  id: string | null,
  input: Omit<MatchResult, "id" | "createdAt" | "updatedAt">,
): Promise<{ ok: true; result: MatchResult } | { ok: false; error: string }> {
  try {
    const result = await saveMatchResult(id, input);
    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(result.eventId));
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save result.",
    };
  }
}

export async function deleteMatchResultAction(
  id: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteMatchResult(id);
    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(eventId));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete result.",
    };
  }
}

export async function markMatchResultsCompleteAction(
  eventId: string,
): Promise<{ ok: true; event: MatchEvent } | { ok: false; error: string }> {
  try {
    const {
      data: { user },
    } = await (await createSupabaseServerClient()).auth.getUser();
    const event = await markMatchResultsComplete(eventId, user?.id ?? null);
    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(event.id));
    if (event.scheduleEventId) {
      revalidatePath(teamOperationsScheduleEventPath(event.scheduleEventId));
    }
    return { ok: true, event };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to mark results complete.",
    };
  }
}

export async function reopenMatchResultsEntryAction(
  eventId: string,
): Promise<{ ok: true; event: MatchEvent } | { ok: false; error: string }> {
  try {
    const event = await reopenMatchResultsEntry(eventId);
    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(event.id));
    if (event.scheduleEventId) {
      revalidatePath(teamOperationsScheduleEventPath(event.scheduleEventId));
    }
    return { ok: true, event };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to reopen results entry.",
    };
  }
}

/**
 * Ensure a Matches container exists for a Schedule event (lazy — only on first save).
 * Does not invent results.
 */
export async function ensureMatchEventForScheduleAction(
  scheduleEventId: string,
): Promise<{ ok: true; event: MatchEvent } | { ok: false; error: string }> {
  try {
    const existing = await getMatchEventByScheduleId(scheduleEventId);
    if (existing) return { ok: true, event: existing };

    const schedule = await getScheduleEvent(scheduleEventId);
    if (!schedule) return { ok: false, error: "Schedule event not found." };

    const format = scheduleResultsFormat(schedule);
    if (format.ambiguous) return { ok: false, error: format.reason };

    const { identityFieldsFromSchedule, buildScheduleSnapshot } = await import("./scheduleLink");
    const identity = identityFieldsFromSchedule(schedule, format.status);
    const event = await saveMatchEvent(null, {
      eventType: format.status,
      ...identity,
      status: "scheduled",
      scoringFormat: format.status === "dual" ? "ncaa_standard" : null,
      reportedTeamScoreDenison: null,
      reportedTeamScoreOpponent: null,
      calculatedTeamScoreDenison: null,
      calculatedTeamScoreOpponent: null,
      teamOutcome: null,
      teamScoreDiscrepancy: false,
      scheduleEventId: schedule.id,
      scheduleSnapshot: buildScheduleSnapshot(schedule),
      scheduleUnlinkedReason: null,
      resultsMarkedCompleteAt: null,
      resultsMarkedCompleteBy: null,
      notes: null,
    });
    revalidatePath(MATCHES_ROUTE);
    revalidatePath(teamOperationsScheduleEventPath(schedule.id));
    return { ok: true, event };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to open results container.",
    };
  }
}

export async function saveMatchEventAction(
  id: string | null,
  input: Omit<MatchEvent, "id" | "createdAt" | "updatedAt">,
): Promise<{ ok: true; event: MatchEvent } | { ok: false; error: string }> {
  try {
    const event = await saveMatchEvent(id, input);
    revalidatePath(MATCHES_ROUTE);
    revalidatePath(matchesEventPath(event.id));
    return { ok: true, event };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save event.",
    };
  }
}

export async function loadMatchesDirectoryAction(): Promise<{
  events: MatchEvent[];
  results: MatchResult[];
  roster: RosterPlayer[];
  loadError: string | null;
}> {
  try {
    const [events, results, people] = await Promise.all([
      listMatchEvents(),
      listMatchResults(),
      listPeople(),
    ]);
    return { events, results, roster: toRoster(people), loadError: null };
  } catch (error) {
    return {
      events: [],
      results: [],
      roster: [],
      loadError: error instanceof Error ? error.message : "Failed to load matches.",
    };
  }
}

export async function getMatchEventBundleAction(eventId: string) {
  const event = await getMatchEvent(eventId);
  if (!event) return null;
  const [results, people, schedule] = await Promise.all([
    listMatchResults(eventId),
    listPeople(),
    event.scheduleEventId ? getScheduleEvent(event.scheduleEventId) : Promise.resolve(null),
  ]);
  return { event, results, roster: toRoster(people), schedule };
}

/** Exported for Schedule delete safeguard messaging. */
export async function findMatchEventLinkedToSchedule(scheduleEventId: string) {
  return getMatchEventByScheduleId(scheduleEventId);
}

export { matchEventTypeFromSchedule };
