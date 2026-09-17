import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TeamScheduleEvent } from "@/features/teamSchedule/types";
import { getScheduleEvent } from "@/features/teamSchedule/repository";

import {
  ensureOrderedPairIds,
  matchEventToRow,
  matchResultToRow,
  rowToDoublesPair,
  rowToImportBatch,
  rowToMatchEvent,
  rowToMatchResult,
  type MatchDoublesPairRow,
  type MatchEventRow,
  type MatchImportBatchRow,
  type MatchResultRow,
} from "./mapping";
import {
  buildScheduleSnapshot,
  identityFieldsFromSchedule,
  matchEventTypeFromSchedule,
  scheduleResultsFormat,
} from "./scheduleLink";
import { resultFingerprint } from "./scoreParse";
import type {
  DualImportDraft,
  MatchDoublesPair,
  MatchEvent,
  MatchImportBatch,
  MatchResult,
  MatchesImportDraft,
  TournamentImportDraft,
} from "./types";

const EVENTS = "match_events";
const RESULTS = "match_results";
const PAIRS = "match_doubles_pairs";
const IMPORTS = "match_import_batches";

export class MatchesRepositoryError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  constructor(
    message: string,
    opts?: { code?: string; details?: string; hint?: string },
  ) {
    super(message);
    this.name = "MatchesRepositoryError";
    this.code = opts?.code;
    this.details = opts?.details;
    this.hint = opts?.hint;
  }
}

function missingTable(message: string): boolean {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

function throwPersist(
  action: string,
  error: { message: string; code?: string; details?: string; hint?: string },
): never {
  throw new MatchesRepositoryError(`Failed to ${action}: ${error.message}`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

export async function listMatchEvents(): Promise<MatchEvent[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(EVENTS)
    .select("*")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    if (missingTable(error.message)) return [];
    throwPersist("load match events", error);
  }
  return ((data as MatchEventRow[] | null) ?? []).map(rowToMatchEvent);
}

export async function getMatchEvent(id: string): Promise<MatchEvent | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from(EVENTS).select("*").eq("id", id).maybeSingle();
  if (error) {
    if (missingTable(error.message)) return null;
    throwPersist("load match event", error);
  }
  return data ? rowToMatchEvent(data as MatchEventRow) : null;
}

export async function getMatchEventByScheduleId(
  scheduleEventId: string,
): Promise<MatchEvent | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(EVENTS)
    .select("*")
    .eq("schedule_event_id", scheduleEventId)
    .maybeSingle();
  if (error) {
    if (missingTable(error.message)) return null;
    throwPersist("load match event by schedule", error);
  }
  return data ? rowToMatchEvent(data as MatchEventRow) : null;
}

export async function listMatchResults(eventId?: string): Promise<MatchResult[]> {
  const client = await createSupabaseServerClient();
  let query = client.from(RESULTS).select("*").order("match_date", { ascending: false });
  if (eventId) query = query.eq("event_id", eventId);
  const { data, error } = await query;
  if (error) {
    if (missingTable(error.message)) return [];
    throwPersist("load match results", error);
  }
  return ((data as MatchResultRow[] | null) ?? []).map(rowToMatchResult);
}

export async function listImportBatchesForEvent(eventId: string): Promise<MatchImportBatch[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(IMPORTS)
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) {
    if (missingTable(error.message)) return [];
    throwPersist("load import batches", error);
  }
  return ((data as MatchImportBatchRow[] | null) ?? []).map(rowToImportBatch);
}

export async function upsertDoublesPair(
  playerAId: string,
  playerBId: string,
): Promise<MatchDoublesPair> {
  const client = await createSupabaseServerClient();
  const ordered = ensureOrderedPairIds(playerAId, playerBId);
  const { data: existing, error: findError } = await client
    .from(PAIRS)
    .select("*")
    .eq("pair_key", ordered.pairKey)
    .maybeSingle();
  if (findError && !missingTable(findError.message)) throwPersist("find doubles pair", findError);
  if (existing) return rowToDoublesPair(existing as MatchDoublesPairRow);

  const { data, error } = await client
    .from(PAIRS)
    .insert({
      player_a_id: ordered.playerAId,
      player_b_id: ordered.playerBId,
      pair_key: ordered.pairKey,
    })
    .select("*")
    .single();
  if (error) throwPersist("create doubles pair", error);
  return rowToDoublesPair(data as MatchDoublesPairRow);
}

export async function saveMatchResult(
  id: string | null,
  input: Omit<MatchResult, "id" | "createdAt" | "updatedAt">,
): Promise<MatchResult> {
  const client = await createSupabaseServerClient();
  let doublesPairId = input.doublesPairId;
  if (input.discipline === "doubles" && input.denisonPlayerAId && input.denisonPlayerBId) {
    const pair = await upsertDoublesPair(input.denisonPlayerAId, input.denisonPlayerBId);
    doublesPairId = pair.id;
  }
  const payload = matchResultToRow({ ...input, doublesPairId: doublesPairId ?? null });
  if (id) {
    const { data, error } = await client.from(RESULTS).update(payload).eq("id", id).select("*").single();
    if (error) throwPersist("update match result", error);
    return rowToMatchResult(data as MatchResultRow);
  }
  const { data, error } = await client.from(RESULTS).insert(payload).select("*").single();
  if (error) throwPersist("create match result", error);
  return rowToMatchResult(data as MatchResultRow);
}

export async function deleteMatchResult(id: string): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(RESULTS).delete().eq("id", id);
  if (error) throwPersist("delete match result", error);
}

export async function saveMatchEvent(
  id: string | null,
  input: Omit<MatchEvent, "id" | "createdAt" | "updatedAt">,
): Promise<MatchEvent> {
  const client = await createSupabaseServerClient();
  const payload = matchEventToRow({ ...input, ...(id ? { id } : {}) });
  if (id) {
    const { data, error } = await client.from(EVENTS).update(payload).eq("id", id).select("*").single();
    if (error) throwPersist("update match event", error);
    return rowToMatchEvent(data as MatchEventRow);
  }
  const { data, error } = await client.from(EVENTS).insert(payload).select("*").single();
  if (error) throwPersist("create match event", error);
  return rowToMatchEvent(data as MatchEventRow);
}

export async function createImportBatch(input: {
  eventType: MatchEvent["eventType"] | null;
  detectionMethod: MatchImportBatch["detectionMethod"];
  sourceText: string;
  draftJson: unknown;
  scheduleEventId?: string | null;
  createdBy?: string | null;
}): Promise<MatchImportBatch> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(IMPORTS)
    .insert({
      event_type: input.eventType,
      detection_method: input.detectionMethod,
      source_text: input.sourceText,
      draft_json: input.draftJson,
      schedule_event_id: input.scheduleEventId ?? null,
      status: "draft",
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();
  if (error) {
    if (missingTable(error.message)) {
      throw new MatchesRepositoryError(
        "Matches tables are not migrated yet. Apply migration 0061_official_matches locally, then retry.",
      );
    }
    throwPersist("create import batch", error);
  }
  return rowToImportBatch(data as MatchImportBatchRow);
}

export async function markImportBatch(
  id: string,
  patch: {
    status: MatchImportBatch["status"];
    eventId?: string | null;
    scheduleEventId?: string | null;
    errorMessage?: string | null;
    draftJson?: unknown;
  },
): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client
    .from(IMPORTS)
    .update({
      status: patch.status,
      event_id: patch.eventId ?? null,
      ...(patch.scheduleEventId !== undefined
        ? { schedule_event_id: patch.scheduleEventId }
        : {}),
      error_message: patch.errorMessage ?? null,
      ...(patch.draftJson !== undefined ? { draft_json: patch.draftJson } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throwPersist("update import batch", error);
}

export type LinkScheduleConflict = {
  code: "already_linked";
  existingMatchEventId: string;
  message: string;
};

/**
 * Link a legacy unlinked Matches event to a Schedule event.
 * Never silently overwrite when Schedule already has a container.
 */
export async function linkMatchEventToSchedule(input: {
  matchEventId: string;
  scheduleEventId: string;
  resolveConflict?: "abort" | "merge_into_existing";
}): Promise<
  | { ok: true; event: MatchEvent; mergedFromId?: string }
  | { ok: false; conflict: LinkScheduleConflict }
> {
  const schedule = await getScheduleEvent(input.scheduleEventId);
  if (!schedule) {
    throw new MatchesRepositoryError("Schedule event not found.");
  }

  const matchEvent = await getMatchEvent(input.matchEventId);
  if (!matchEvent) {
    throw new MatchesRepositoryError("Matches event not found.");
  }

  const existing = await getMatchEventByScheduleId(input.scheduleEventId);
  if (existing && existing.id !== matchEvent.id) {
    if (input.resolveConflict !== "merge_into_existing") {
      return {
        ok: false,
        conflict: {
          code: "already_linked",
          existingMatchEventId: existing.id,
          message: `Schedule event is already linked to Matches event ${existing.id}. Choose merge to move results into that container, or cancel — nothing was overwritten.`,
        },
      };
    }
    return mergeMatchEventInto(matchEvent.id, existing.id, schedule);
  }

  const eventType = matchEventTypeFromSchedule(schedule) ?? matchEvent.eventType;
  const identity = identityFieldsFromSchedule(schedule, eventType);
  const updated = await saveMatchEvent(matchEvent.id, {
    ...matchEvent,
    ...identity,
    eventType,
    scheduleEventId: schedule.id,
    scheduleSnapshot: buildScheduleSnapshot(schedule),
    scheduleUnlinkedReason: null,
  });
  return { ok: true, event: updated };
}

async function mergeMatchEventInto(
  sourceId: string,
  targetId: string,
  schedule: TeamScheduleEvent,
): Promise<{ ok: true; event: MatchEvent; mergedFromId: string }> {
  const client = await createSupabaseServerClient();
  const source = await getMatchEvent(sourceId);
  const target = await getMatchEvent(targetId);
  if (!source || !target) {
    throw new MatchesRepositoryError("Cannot merge: source or target Matches event missing.");
  }

  const sourceResults = await listMatchResults(sourceId);
  const targetResults = await listMatchResults(targetId);
  const existingFingerprints = new Set(
    targetResults.map((r) => r.importFingerprint).filter((fp): fp is string => Boolean(fp)),
  );

  for (const result of sourceResults) {
    if (result.importFingerprint && existingFingerprints.has(result.importFingerprint)) {
      continue;
    }
    const { error } = await client
      .from(RESULTS)
      .update({ event_id: targetId, updated_at: new Date().toISOString() })
      .eq("id", result.id);
    if (error) throwPersist("move result during merge", error);
    if (result.importFingerprint) existingFingerprints.add(result.importFingerprint);
  }

  await client.from(IMPORTS).update({ event_id: targetId }).eq("event_id", sourceId);

  const eventType = matchEventTypeFromSchedule(schedule) ?? target.eventType;
  const identity = identityFieldsFromSchedule(schedule, eventType);
  const updated = await saveMatchEvent(targetId, {
    ...target,
    ...identity,
    eventType,
    scheduleEventId: schedule.id,
    scheduleSnapshot: buildScheduleSnapshot(schedule),
    scheduleUnlinkedReason: null,
    reportedTeamScoreDenison:
      target.reportedTeamScoreDenison ?? source.reportedTeamScoreDenison,
    reportedTeamScoreOpponent:
      target.reportedTeamScoreOpponent ?? source.reportedTeamScoreOpponent,
    calculatedTeamScoreDenison:
      target.calculatedTeamScoreDenison ?? source.calculatedTeamScoreDenison,
    calculatedTeamScoreOpponent:
      target.calculatedTeamScoreOpponent ?? source.calculatedTeamScoreOpponent,
    teamOutcome: target.teamOutcome ?? source.teamOutcome,
    teamScoreDiscrepancy: target.teamScoreDiscrepancy || source.teamScoreDiscrepancy,
  });

  const { error: deleteError } = await client.from(EVENTS).delete().eq("id", sourceId);
  if (deleteError) throwPersist("delete merged source event", deleteError);

  return { ok: true, event: updated, mergedFromId: sourceId };
}

/**
 * Atomically save a reviewed import draft onto the official container for a Schedule event.
 * Same Schedule → no duplicate containers; incremental results via fingerprint skip.
 */
export async function saveConfirmedImport(input: {
  draft: MatchesImportDraft;
  sourceText: string;
  importBatchId?: string | null;
  scheduleEventId: string;
  skipFingerprints?: Set<string>;
}): Promise<{ event: MatchEvent; results: MatchResult[]; skipped: number }> {
  const { draft } = input;
  if (!input.scheduleEventId) {
    throw new MatchesRepositoryError(
      "Select a Schedule event before confirming import. New official results must be linked to Schedule.",
    );
  }

  const schedule = await getScheduleEvent(input.scheduleEventId);
  if (!schedule) {
    throw new MatchesRepositoryError("Schedule event not found. Paste and draft were preserved.");
  }

  const format = scheduleResultsFormat(schedule);
  if (format.ambiguous) {
    throw new MatchesRepositoryError(format.reason);
  }
  if (draft.kind !== format.status) {
    throw new MatchesRepositoryError(
      `Draft is ${draft.kind} but Schedule event maps to ${format.status}. Edit the Schedule event type or switch events — paste and draft were preserved.`,
    );
  }

  const client = await createSupabaseServerClient();
  const snapshot = buildScheduleSnapshot(schedule);
  const identity = identityFieldsFromSchedule(schedule, format.status);

  let event = await getMatchEventByScheduleId(schedule.id);

  if (!event) {
    const eventInput =
      draft.kind === "dual"
        ? dualDraftToEvent(draft, schedule, identity, snapshot)
        : tournamentDraftToEvent(draft, schedule, identity, snapshot);

    const { data: eventRow, error: eventError } = await client
      .from(EVENTS)
      .insert(matchEventToRow(eventInput))
      .select("*")
      .single();

    if (eventError) {
      if (eventError.code === "23505") {
        // Concurrent import created the container — reuse it
        event = await getMatchEventByScheduleId(schedule.id);
        if (!event) {
          throwPersist("save match event from import (unique race)", eventError);
        }
      } else {
        if (input.importBatchId) {
          await markImportBatch(input.importBatchId, {
            status: "failed",
            scheduleEventId: schedule.id,
            errorMessage: eventError.message,
            draftJson: draft,
          }).catch(() => undefined);
        }
        throwPersist("save match event from import", eventError);
      }
    } else {
      event = rowToMatchEvent(eventRow as MatchEventRow);
    }
  } else {
    // Refresh identity snapshot from Schedule; update dual score fields when provided
    const patch: Omit<MatchEvent, "id" | "createdAt" | "updatedAt"> = {
      ...event,
      ...identity,
      eventType: format.status,
      scheduleEventId: schedule.id,
      scheduleSnapshot: snapshot,
      scheduleUnlinkedReason: null,
    };
    if (draft.kind === "dual") {
      patch.scoringFormat = draft.scoringFormat;
      patch.reportedTeamScoreDenison = draft.reportedTeamScoreDenison;
      patch.reportedTeamScoreOpponent = draft.reportedTeamScoreOpponent;
      patch.calculatedTeamScoreDenison = draft.calculatedTeamScoreDenison;
      patch.calculatedTeamScoreOpponent = draft.calculatedTeamScoreOpponent;
      patch.teamOutcome = draft.teamOutcome;
      patch.teamScoreDiscrepancy = draft.teamScoreDiscrepancy;
      patch.status = draft.results.some((r) => r.status === "unfinished")
        ? "unfinished"
        : "completed";
    }
    event = await saveMatchEvent(event.id, patch);
  }

  const existing = await listMatchResults(event.id);
  const existingFingerprints = new Set(
    existing.map((r) => r.importFingerprint).filter((fp): fp is string => Boolean(fp)),
  );

  const resultInputs =
    draft.kind === "dual"
      ? await dualDraftToResults(draft, event.id, schedule.startDate)
      : await tournamentDraftToResults(draft, event.id, schedule.startDate);

  const saved: MatchResult[] = [];
  let skipped = 0;
  try {
    for (const result of resultInputs) {
      const fp = result.importFingerprint;
      if (fp && (existingFingerprints.has(fp) || input.skipFingerprints?.has(fp))) {
        skipped += 1;
        continue;
      }
      const { data, error } = await client
        .from(RESULTS)
        .insert(matchResultToRow(result))
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505" && fp) {
          skipped += 1;
          continue;
        }
        throw error;
      }
      saved.push(rowToMatchResult(data as MatchResultRow));
      if (fp) existingFingerprints.add(fp);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save results";
    if (input.importBatchId) {
      await markImportBatch(input.importBatchId, {
        status: "failed",
        eventId: event.id,
        scheduleEventId: schedule.id,
        errorMessage: message,
        draftJson: draft,
      }).catch(() => undefined);
    }
    throw new MatchesRepositoryError(
      `Import partially failed on event ${event.id}: ${message}. Paste and draft were preserved on the import batch.`,
    );
  }

  if (input.importBatchId) {
    await markImportBatch(input.importBatchId, {
      status: "confirmed",
      eventId: event.id,
      scheduleEventId: schedule.id,
      draftJson: draft,
    });
  }

  return { event, results: saved, skipped };
}

/**
 * Explicit “Mark results complete”. Validates that entry work exists.
 * Does not invent scores or outcomes.
 */
export async function markMatchResultsComplete(
  eventId: string,
  markedBy?: string | null,
): Promise<MatchEvent> {
  const event = await getMatchEvent(eventId);
  if (!event) throw new MatchesRepositoryError("Matches event not found.");
  const results = await listMatchResults(eventId);
  if (!hasResultsEntryWork(event, results.length)) {
    throw new MatchesRepositoryError(
      "Add at least one result or team score before marking results complete.",
    );
  }
  return saveMatchEvent(eventId, {
    ...event,
    resultsMarkedCompleteAt: new Date().toISOString(),
    resultsMarkedCompleteBy: markedBy ?? null,
  });
}

/** Reopen Results entry for corrections — clears complete mark only. */
export async function reopenMatchResultsEntry(eventId: string): Promise<MatchEvent> {
  const event = await getMatchEvent(eventId);
  if (!event) throw new MatchesRepositoryError("Matches event not found.");
  return saveMatchEvent(eventId, {
    ...event,
    resultsMarkedCompleteAt: null,
    resultsMarkedCompleteBy: null,
  });
}

function hasResultsEntryWork(event: MatchEvent, resultCount: number): boolean {
  if (resultCount > 0) return true;
  if (event.reportedTeamScoreDenison != null || event.reportedTeamScoreOpponent != null) return true;
  if (event.calculatedTeamScoreDenison != null || event.calculatedTeamScoreOpponent != null) {
    return true;
  }
  if (event.teamOutcome != null) return true;
  return false;
}

function dualDraftToEvent(
  draft: DualImportDraft,
  schedule: TeamScheduleEvent,
  identity: ReturnType<typeof identityFieldsFromSchedule>,
  snapshot: ReturnType<typeof buildScheduleSnapshot>,
): Omit<MatchEvent, "id" | "createdAt" | "updatedAt"> {
  return {
    eventType: "dual",
    ...identity,
    status: draft.results.some((r) => r.status === "unfinished") ? "unfinished" : "completed",
    scoringFormat: draft.scoringFormat,
    reportedTeamScoreDenison: draft.reportedTeamScoreDenison,
    reportedTeamScoreOpponent: draft.reportedTeamScoreOpponent,
    calculatedTeamScoreDenison: draft.calculatedTeamScoreDenison,
    calculatedTeamScoreOpponent: draft.calculatedTeamScoreOpponent,
    teamOutcome: draft.teamOutcome,
    teamScoreDiscrepancy: draft.teamScoreDiscrepancy,
    scheduleEventId: schedule.id,
    scheduleSnapshot: snapshot,
    scheduleUnlinkedReason: null,
    resultsMarkedCompleteAt: null,
    resultsMarkedCompleteBy: null,
    notes: null,
  };
}

function tournamentDraftToEvent(
  draft: TournamentImportDraft,
  schedule: TeamScheduleEvent,
  identity: ReturnType<typeof identityFieldsFromSchedule>,
  snapshot: ReturnType<typeof buildScheduleSnapshot>,
): Omit<MatchEvent, "id" | "createdAt" | "updatedAt"> {
  return {
    eventType: "tournament",
    ...identity,
    status: "completed",
    scoringFormat: null,
    reportedTeamScoreDenison: null,
    reportedTeamScoreOpponent: null,
    calculatedTeamScoreDenison: null,
    calculatedTeamScoreOpponent: null,
    teamOutcome: null,
    teamScoreDiscrepancy: false,
    scheduleEventId: schedule.id,
    scheduleSnapshot: snapshot,
    scheduleUnlinkedReason: null,
    resultsMarkedCompleteAt: null,
    resultsMarkedCompleteBy: null,
    notes: null,
  };
}

async function dualDraftToResults(
  draft: DualImportDraft,
  eventId: string,
  matchDate: string | null,
): Promise<Array<Omit<MatchResult, "id" | "createdAt" | "updatedAt">>> {
  const rows: Array<Omit<MatchResult, "id" | "createdAt" | "updatedAt">> = [];
  for (const row of draft.results) {
    let doublesPairId: string | null = null;
    if (row.discipline === "doubles" && row.denisonA.personId && row.denisonB?.personId) {
      doublesPairId = (await upsertDoublesPair(row.denisonA.personId, row.denisonB.personId)).id;
    }
    const fingerprint = resultFingerprint({
      discipline: row.discipline,
      lineupPosition: row.lineupPosition,
      denisonPlayerAId: row.denisonA.personId,
      denisonPlayerBId: row.denisonB?.personId,
      opponentA: row.opponentAName,
      opponentB: row.opponentBName,
      scoreText: row.scoreText,
      status: row.status,
    });
    rows.push({
      eventId,
      discipline: row.discipline,
      resultKind: "dual_lineup",
      lineupPosition: row.lineupPosition,
      drawName: null,
      flightName: null,
      divisionName: null,
      roundLabel: null,
      matchDate: matchDate ?? draft.startDate,
      status: row.status,
      winnerSide: row.winnerSide,
      scoreText: row.scoreText,
      scoreSets: row.scoreSets,
      originalScoreText: row.originalScoreText,
      sourceExcerpt: row.sourceExcerpt,
      notes: null,
      denisonPlayerAId: row.denisonA.personId,
      denisonPlayerBId: row.denisonB?.personId ?? null,
      doublesPairId,
      opponentPlayerAName: row.opponentAName,
      opponentPlayerBName: row.opponentBName,
      opponentSchool: row.opponentSchool,
      countsTowardTeamPoint: row.countsTowardTeamPoint,
      teamPointAwardedTo: row.teamPointAwardedTo,
      importFingerprint: fingerprint,
    });
  }
  return rows;
}

async function tournamentDraftToResults(
  draft: TournamentImportDraft,
  eventId: string,
  fallbackDate: string | null,
): Promise<Array<Omit<MatchResult, "id" | "createdAt" | "updatedAt">>> {
  const rows: Array<Omit<MatchResult, "id" | "createdAt" | "updatedAt">> = [];
  for (const row of draft.results) {
    let doublesPairId: string | null = null;
    if (row.discipline === "doubles" && row.denisonA.personId && row.denisonB?.personId) {
      doublesPairId = (await upsertDoublesPair(row.denisonA.personId, row.denisonB.personId)).id;
    }
    const fingerprint = resultFingerprint({
      discipline: row.discipline,
      drawName: row.drawName,
      roundLabel: row.roundLabel,
      denisonPlayerAId: row.denisonA.personId,
      denisonPlayerBId: row.denisonB?.personId,
      opponentA: row.opponentAName,
      opponentB: row.opponentBName,
      scoreText: row.scoreText,
      status: row.status,
    });
    rows.push({
      eventId,
      discipline: row.discipline,
      resultKind: "tournament_match",
      lineupPosition: null,
      drawName: row.drawName,
      flightName: row.flightName,
      divisionName: row.divisionName,
      roundLabel: row.roundLabel,
      matchDate: row.matchDate ?? draft.startDate ?? fallbackDate,
      status: row.status,
      winnerSide: row.winnerSide,
      scoreText: row.scoreText,
      scoreSets: row.scoreSets,
      originalScoreText: row.originalScoreText,
      sourceExcerpt: row.sourceExcerpt,
      notes: null,
      denisonPlayerAId: row.denisonA.personId,
      denisonPlayerBId: row.denisonB?.personId ?? null,
      doublesPairId,
      opponentPlayerAName: row.opponentAName,
      opponentPlayerBName: row.opponentBName,
      opponentSchool: row.opponentSchool,
      countsTowardTeamPoint: false,
      teamPointAwardedTo: "none",
      importFingerprint: fingerprint,
    });
  }
  return rows;
}
