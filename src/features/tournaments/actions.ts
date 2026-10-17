"use server";

import { revalidatePath } from "next/cache";

import { recruitingTournamentPath, RECRUITING_TOURNAMENTS_ROUTE } from "@/lib/module-routes";

import {
  deleteTournament,
  linkRecruitsToTournament,
  saveTournament,
  unlinkRecruitFromTournament,
  updateTournamentRecruitLink,
  importTournamentParticipants,
  saveTournamentParticipantEvaluation,
  saveTournamentParticipantDetails,
  setTournamentPlanToAttend,
  addPotentialRecruitsAndEnrich,
  promoteTournamentParticipants,
} from "./repository";
import { isAttendanceStatus, normalizeTournamentInput } from "./mapping";
import type { AttendanceStatus, Tournament, TournamentInput, TournamentParticipant, TournamentParticipantDetails, TournamentParticipantEvaluation, TournamentRecruitEnrichmentSummary } from "./types";
import { importTournamentUrl, type TournamentUrlImport } from "./urlImport";
import { parseTournamentParticipants } from "./participantImport";

function revalidateTournaments(tournamentId?: string) {
  revalidatePath(RECRUITING_TOURNAMENTS_ROUTE);
  if (tournamentId) revalidatePath(recruitingTournamentPath(tournamentId));
}

export async function importTournamentParticipantsAction(
  tournamentId: string,
  rawText: string,
): Promise<{ success: true; participants: TournamentParticipant[] } | { success: false; error: string }> {
  const parsed = parseTournamentParticipants(rawText);
  if (parsed.length === 0) return { success: false, error: "No participant rows were recognized. Include name, events, city/state, and gender columns." };
  try {
    const participants = await importTournamentParticipants(tournamentId, parsed);
    revalidateTournaments(tournamentId);
    return { success: true, participants };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not import participants." };
  }
}

export async function addPotentialRecruitsAndEnrichAction(tournamentId: string): Promise<{ success: true; summary: TournamentRecruitEnrichmentSummary } | { success: false; error: string }> {
  try {
    const summary = await addPotentialRecruitsAndEnrich(tournamentId);
    revalidateTournaments(tournamentId);
    return { success: true, summary };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not add and enrich Potential recruits." };
  }
}

export async function promoteTournamentParticipantsAction(
  tournamentId: string,
  participantIds: string[],
): Promise<{ success: true; created: number; participants: TournamentParticipant[] } | { success: false; error: string }> {
  try {
    const result = await promoteTournamentParticipants(tournamentId, participantIds);
    revalidateTournaments(tournamentId);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not add selected players to Recruiting OS." };
  }
}

export async function saveTournamentParticipantEvaluationAction(
  tournamentId: string,
  participantId: string,
  evaluation: TournamentParticipantEvaluation,
): Promise<{ success: true; participant: TournamentParticipant } | { success: false; error: string }> {
  if (evaluation.overallRating !== null && (evaluation.overallRating < 1 || evaluation.overallRating > 5)) {
    return { success: false, error: "Overall rating must be between 1 and 5." };
  }
  try {
    const participant = await saveTournamentParticipantEvaluation(participantId, evaluation);
    revalidateTournaments(tournamentId);
    return { success: true, participant };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not save evaluation." };
  }
}

export async function saveTournamentParticipantDetailsAction(
  tournamentId: string,
  participantId: string,
  details: TournamentParticipantDetails,
): Promise<{ success: true; participant: TournamentParticipant } | { success: false; error: string }> {
  if ([details.utr, details.trnRank, details.trnStarRating, details.classYear].some((value) => value !== null && !Number.isFinite(value))) return { success: false, error: "Ratings and class year must be numbers." };
  if (details.utr !== null && (details.utr <= 0 || details.utr > 16.5)) return { success: false, error: "UTR must be between 0 and 16.5." };
  if (details.trnRank !== null && details.trnRank < 1) return { success: false, error: "TRN rank must be a positive number." };
  if (details.trnStarRating !== null && (details.trnStarRating < 1 || details.trnStarRating > 6)) return { success: false, error: "TRN rating must be between 1 and 6." };
  if (details.classYear !== null && (details.classYear < 2020 || details.classYear > 2100)) return { success: false, error: "Enter a valid four-digit class year." };
  try {
    const participant = await saveTournamentParticipantDetails(participantId, details);
    revalidateTournaments(tournamentId);
    return { success: true, participant };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not save player information." };
  }
}

export async function importTournamentUrlAction(
  url: string,
): Promise<{ success: true; imported: TournamentUrlImport } | { success: false; error: string }> {
  try {
    return { success: true, imported: await importTournamentUrl(url) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not read that tournament page.",
    };
  }
}

export async function saveTournamentAction(
  id: string | null,
  input: TournamentInput,
  recruitPersonIds?: readonly string[],
): Promise<{ success: true; tournament: Tournament } | { success: false; error: string }> {
  const parsed = normalizeTournamentInput(input);
  if ("error" in parsed) return { success: false, error: parsed.error };
  try {
    let tournament = await saveTournament(id, parsed);
    if (recruitPersonIds && recruitPersonIds.length > 0) {
      tournament = await linkRecruitsToTournament(tournament.id, recruitPersonIds);
    }
    revalidateTournaments(tournament.id);
    return { success: true, tournament };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Save failed." };
  }
}

export async function setTournamentPlanToAttendAction(
  tournamentId: string,
  planToAttend: boolean,
): Promise<{ success: true; tournament: Tournament } | { success: false; error: string }> {
  try {
    const tournament = await setTournamentPlanToAttend(tournamentId, planToAttend);
    revalidateTournaments(tournamentId);
    return { success: true, tournament };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not update attendance plan.",
    };
  }
}

export async function deleteTournamentAction(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await deleteTournament(id);
    revalidateTournaments(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed." };
  }
}

export async function linkRecruitsAction(
  tournamentId: string,
  personIds: readonly string[],
): Promise<{ success: true; tournament: Tournament } | { success: false; error: string }> {
  if (personIds.length === 0) return { success: false, error: "Select at least one recruit." };
  try {
    const tournament = await linkRecruitsToTournament(tournamentId, personIds);
    revalidateTournaments(tournamentId);
    return { success: true, tournament };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not link recruits." };
  }
}

export async function unlinkRecruitAction(
  tournamentId: string,
  personId: string,
): Promise<{ success: true; tournament: Tournament } | { success: false; error: string }> {
  try {
    const tournament = await unlinkRecruitFromTournament(tournamentId, personId);
    revalidateTournaments(tournamentId);
    return { success: true, tournament };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not unlink recruit." };
  }
}

export async function updateTournamentRecruitAction(
  tournamentId: string,
  personId: string,
  patch: { attendanceStatus: AttendanceStatus; notes: string | null },
): Promise<{ success: true; tournament: Tournament } | { success: false; error: string }> {
  if (!isAttendanceStatus(patch.attendanceStatus)) {
    return { success: false, error: "Choose a valid attendance status." };
  }
  try {
    const tournament = await updateTournamentRecruitLink(tournamentId, personId, {
      attendanceStatus: patch.attendanceStatus,
      notes: patch.notes,
    });
    revalidateTournaments(tournamentId);
    return { success: true, tournament };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not update recruit." };
  }
}
