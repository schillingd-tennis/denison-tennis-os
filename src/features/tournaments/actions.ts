"use server";

import { revalidatePath } from "next/cache";

import { recruitingTournamentPath, RECRUITING_TOURNAMENTS_ROUTE } from "@/lib/module-routes";

import {
  deleteTournament,
  linkRecruitsToTournament,
  saveTournament,
  unlinkRecruitFromTournament,
  updateTournamentRecruitLink,
} from "./repository";
import { isAttendanceStatus, normalizeTournamentInput } from "./mapping";
import type { AttendanceStatus, Tournament, TournamentInput } from "./types";

function revalidateTournaments(tournamentId?: string) {
  revalidatePath(RECRUITING_TOURNAMENTS_ROUTE);
  if (tournamentId) revalidatePath(recruitingTournamentPath(tournamentId));
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
