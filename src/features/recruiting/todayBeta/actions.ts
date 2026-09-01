"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RECRUITING_TODAY_BETA_ROUTE, recruitingPersonPath } from "@/lib/module-routes";

import { parseTrnPaste } from "./parseTrnPaste";
import {
  ContactWorkflowError,
  dismissResultOpportunity,
  dismissTournamentOpportunity,
  markContactTextSent,
  snoozeCadenceOpportunity,
} from "./contactWorkflow";
import {
  loadTodayBetaPageData,
  markRecruitResultsCheckedNoNew,
  saveTodayBetaMatchResults,
  saveUtrCapturedResults,
  saveUtrExternalProfile,
  setUtrMonitoringEnabled,
  TodayBetaRepositoryError,
} from "./repository";
import { fetchUtrAgentHealth } from "./utrAgentClient";
import {
  UTR_AGENT_BATCH_CHECK_ENABLED,
} from "./utrAgentConfig";
import {
  countMonitoredRecruitsForBatch,
  runUtrAutomaticCheck,
  type UtrAgentRunSummary,
} from "./utrAgentRun";
import {
  cancelRecruitUpcomingTournament,
  createRecruitUpcomingTournament,
  updateRecruitUpcomingTournament,
  UpcomingTournamentRepositoryError,
} from "./upcomingTournamentsRepository";
import type {
  ParsedMatchPreview,
  RecruitUpcomingTournament,
  RecruitUpcomingTournamentInput,
  SaveMatchResultsInput,
  SaveMatchResultsOutcome,
  SaveUtrCapturedResultsInput,
  TodayBetaPageData,
  UtrExternalProfile,
} from "./types";

export type TodayBetaActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireUser(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your session has expired. Please sign in again.",
    };
  }
  return { ok: true };
}

export async function getTodayBetaPageDataAction(): Promise<TodayBetaActionResult<TodayBetaPageData>> {
  try {
    const data = await loadTodayBetaPageData();
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof TodayBetaRepositoryError
        ? error.message
        : "Failed to load Today Beta data.";
    return { success: false, error: message };
  }
}

export async function parseTrnPasteAction(
  rawText: string,
): Promise<TodayBetaActionResult<ParsedMatchPreview[]>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = parseTrnPaste(rawText);
  if (parsed.length === 0) {
    return { success: false, error: "No match blocks detected in pasted text." };
  }
  return { success: true, data: parsed };
}

export async function saveTodayBetaMatchResultsAction(
  input: SaveMatchResultsInput,
): Promise<TodayBetaActionResult<SaveMatchResultsOutcome>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.recruitPersonId.trim()) {
    return { success: false, error: "Recruit is required." };
  }
  if (input.rows.length === 0) {
    return { success: false, error: "No results selected to save." };
  }

  try {
    const outcome = await saveTodayBetaMatchResults(input);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: outcome };
  } catch (error) {
    const message =
      error instanceof TodayBetaRepositoryError ? error.message : "Import failed.";
    return { success: false, error: message };
  }
}

export async function markRecruitResultsCheckedNoNewAction(input: {
  recruitPersonId: string;
  source?: "TRN" | "UTR";
}): Promise<TodayBetaActionResult<{ lastCheckedAt: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.recruitPersonId.trim()) {
    return { success: false, error: "Recruit is required." };
  }

  try {
    const outcome = await markRecruitResultsCheckedNoNew(
      input.recruitPersonId,
      input.source ?? "TRN",
    );
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: outcome };
  } catch (error) {
    const message =
      error instanceof TodayBetaRepositoryError
        ? error.message
        : "Failed to mark recruit checked.";
    return { success: false, error: message };
  }
}

export async function saveUtrExternalProfileAction(input: {
  recruitPersonId: string;
  playerId: string;
}): Promise<TodayBetaActionResult<{ utr: UtrExternalProfile | undefined }>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.recruitPersonId.trim() || !input.playerId.trim()) {
    return { success: false, error: "Recruit and UTR player id are required." };
  }

  try {
    const outcome = await saveUtrExternalProfile(input);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: outcome };
  } catch (error) {
    const message =
      error instanceof TodayBetaRepositoryError
        ? error.message
        : "Failed to save UTR profile.";
    return { success: false, error: message };
  }
}

export async function setUtrMonitoringEnabledAction(input: {
  recruitPersonId: string;
  enabled: boolean;
}): Promise<TodayBetaActionResult<{ enabled: boolean }>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.recruitPersonId.trim()) {
    return { success: false, error: "Recruit is required." };
  }

  try {
    const result = await setUtrMonitoringEnabled(input);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof TodayBetaRepositoryError
        ? error.message
        : "Failed to update UTR monitoring.";
    return { success: false, error: message };
  }
}

export async function getUtrAgentStatusAction(): Promise<
  TodayBetaActionResult<{
    online: boolean;
    batchCheckEnabled: boolean;
    rankBoardCount: number;
    configuredCount: number;
    missingUtrCount: number;
  }>
> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const [health, cohort] = await Promise.all([
    fetchUtrAgentHealth(),
    countMonitoredRecruitsForBatch(),
  ]);
  return {
    success: true,
    data: {
      online: health.online,
      batchCheckEnabled: UTR_AGENT_BATCH_CHECK_ENABLED,
      rankBoardCount: cohort.rankBoardCount,
      configuredCount: cohort.configured,
      missingUtrCount: cohort.missingUtr,
    },
  };
}

export async function runUtrAutomaticCheckAction(input: {
  mode: "isaac-only" | "all";
}): Promise<TodayBetaActionResult<UtrAgentRunSummary>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (input.mode === "all" && !UTR_AGENT_BATCH_CHECK_ENABLED) {
    return {
      success: false,
      error: "Monitored-recruit automatic check is disabled.",
    };
  }

  try {
    const summary = await runUtrAutomaticCheck(input.mode);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: summary };
  } catch (error) {
    const message =
      error instanceof Error && error.message === "AGENT_OFFLINE"
        ? "UTR Results Agent is offline. Start the local agent and try again."
        : error instanceof Error && error.message === "AGENT_BUSY"
          ? "UTR Results Agent is busy with another check."
          : error instanceof Error
            ? error.message
            : "UTR automatic check failed.";
    return { success: false, error: message };
  }
}

export async function saveUtrCapturedResultsAction(
  input: SaveUtrCapturedResultsInput,
): Promise<TodayBetaActionResult<SaveMatchResultsOutcome>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.recruitPersonId.trim()) {
    return { success: false, error: "Recruit is required." };
  }
  if (!input.utrPlayerId.trim()) {
    return { success: false, error: "UTR player id is required." };
  }
  if (input.matches.length === 0) {
    return { success: false, error: "No UTR matches to import." };
  }

  try {
    const outcome = await saveUtrCapturedResults(input);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: outcome };
  } catch (error) {
    const message =
      error instanceof TodayBetaRepositoryError ? error.message : "UTR import failed.";
    return { success: false, error: message };
  }
}

function revalidateTodayBetaContactPaths(recruitPersonId: string) {
  revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
  revalidatePath(recruitingPersonPath(recruitPersonId));
  revalidatePath("/recruiting/interactions");
}

export async function markContactTextSentAction(input: {
  recruitPersonId: string;
  messageText: string;
  matchResultId?: string | null;
  upcomingTournamentId?: string | null;
}): Promise<TodayBetaActionResult<{ interactionId: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.recruitPersonId.trim()) {
    return { success: false, error: "Recruit is required." };
  }
  if (!input.messageText.trim()) {
    return { success: false, error: "Message text is required." };
  }

  try {
    const outcome = await markContactTextSent(input);
    revalidateTodayBetaContactPaths(input.recruitPersonId);
    return { success: true, data: outcome };
  } catch (error) {
    const message =
      error instanceof ContactWorkflowError ? error.message : "Failed to log text.";
    return { success: false, error: message };
  }
}

export async function dismissResultOpportunityAction(input: {
  recruitPersonId: string;
  matchResultId: string;
}): Promise<TodayBetaActionResult<{ dismissed: true }>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.matchResultId.trim()) {
    return { success: false, error: "Match result is required to dismiss." };
  }

  try {
    await dismissResultOpportunity(input);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: { dismissed: true } };
  } catch (error) {
    const message =
      error instanceof ContactWorkflowError ? error.message : "Failed to dismiss opportunity.";
    return { success: false, error: message };
  }
}

export async function snoozeCadenceOpportunityAction(input: {
  recruitPersonId: string;
}): Promise<TodayBetaActionResult<{ snoozeUntil: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.recruitPersonId.trim()) {
    return { success: false, error: "Recruit is required." };
  }

  try {
    const outcome = await snoozeCadenceOpportunity({ recruitPersonId: input.recruitPersonId });
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: outcome };
  } catch (error) {
    const message =
      error instanceof ContactWorkflowError ? error.message : "Failed to snooze opportunity.";
    return { success: false, error: message };
  }
}

export async function dismissTournamentOpportunityAction(input: {
  recruitPersonId: string;
  upcomingTournamentId: string;
}): Promise<TodayBetaActionResult<{ dismissed: true }>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.upcomingTournamentId.trim()) {
    return { success: false, error: "Tournament is required to dismiss." };
  }

  try {
    await dismissTournamentOpportunity(input);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: { dismissed: true } };
  } catch (error) {
    const message =
      error instanceof ContactWorkflowError ? error.message : "Failed to dismiss opportunity.";
    return { success: false, error: message };
  }
}

export async function saveRecruitUpcomingTournamentAction(input: {
  id?: string | null;
  tournament: RecruitUpcomingTournamentInput;
}): Promise<TodayBetaActionResult<RecruitUpcomingTournament>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const saved = input.id
      ? await updateRecruitUpcomingTournament(input.id, input.tournament)
      : await createRecruitUpcomingTournament(input.tournament);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: saved };
  } catch (error) {
    const message =
      error instanceof UpcomingTournamentRepositoryError
        ? error.message
        : "Failed to save tournament.";
    return { success: false, error: message };
  }
}

export async function cancelRecruitUpcomingTournamentAction(
  tournamentId: string,
): Promise<TodayBetaActionResult<RecruitUpcomingTournament>> {
  const auth = await requireUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!tournamentId.trim()) {
    return { success: false, error: "Tournament is required." };
  }

  try {
    const cancelled = await cancelRecruitUpcomingTournament(tournamentId);
    revalidatePath(RECRUITING_TODAY_BETA_ROUTE);
    return { success: true, data: cancelled };
  } catch (error) {
    const message =
      error instanceof UpcomingTournamentRepositoryError
        ? error.message
        : "Failed to cancel tournament.";
    return { success: false, error: message };
  }
}
