import { listPeople } from "@/features/people/repository";
import { getDisplayName, getHometown, getInitials } from "@/features/people/utils";
import { listRecruitProfiles } from "@/features/recruiting/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  attendanceFromRow,
  inputToRow,
  rowToTournament,
  type RecruitingTournamentRecruitRow,
  type RecruitingTournamentRow,
} from "./mapping";
import type {
  AttendanceStatus,
  ListTournamentsResult,
  Tournament,
  TournamentInput,
  TournamentLinkedRecruit,
} from "./types";

const TABLE = "recruiting_tournaments";
const LINKS_TABLE = "recruiting_tournament_recruits";

export class TournamentRepositoryError extends Error {}

function missingTable(message: string): boolean {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

function linkedRecruitFromPerson(
  personId: string,
  attendanceStatus: AttendanceStatus,
  notes: string | null,
  peopleById: Map<string, Awaited<ReturnType<typeof listPeople>>[number]>,
  profilesByPersonId: Map<string, Awaited<ReturnType<typeof listRecruitProfiles>>[number]>,
): TournamentLinkedRecruit {
  const person = peopleById.get(personId);
  const profile = profilesByPersonId.get(personId);
  return {
    personId,
    displayName: person ? getDisplayName(person) : "Unknown recruit",
    initials: person ? getInitials(person) : "?",
    photoUrl: person?.photoUrl,
    recruitClassYear: profile?.recruitClassYear,
    hometown: person ? getHometown(person) : undefined,
    utr: person?.utr,
    trnRank: person?.trnRank,
    pipelineLabel: profile?.pipelineStage?.label,
    priorityLabel: profile?.priority?.label,
    attendanceStatus,
    notes: notes ?? undefined,
  };
}

async function attachLinkedRecruits(
  tournaments: Tournament[],
): Promise<Tournament[]> {
  if (tournaments.length === 0) return tournaments;

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(LINKS_TABLE)
    .select("*")
    .in(
      "tournament_id",
      tournaments.map((tournament) => tournament.id),
    );

  if (error) {
    if (missingTable(error.message)) {
      return tournaments;
    }
    throw new TournamentRepositoryError(`Failed to load tournament recruits: ${error.message}`);
  }

  const links = (data as RecruitingTournamentRecruitRow[] | null) ?? [];
  if (links.length === 0) return tournaments;

  const [people, profiles] = await Promise.all([listPeople(), listRecruitProfiles()]);
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const profilesByPersonId = new Map(profiles.map((profile) => [profile.personId, profile]));

  const byTournament = new Map<string, TournamentLinkedRecruit[]>();
  for (const link of links) {
    const recruit = linkedRecruitFromPerson(
      link.recruit_person_id,
      attendanceFromRow(link),
      link.notes,
      peopleById,
      profilesByPersonId,
    );
    const current = byTournament.get(link.tournament_id) ?? [];
    current.push(recruit);
    byTournament.set(link.tournament_id, current);
  }

  return tournaments.map((tournament) => ({
    ...tournament,
    linkedRecruits: byTournament.get(tournament.id) ?? [],
  }));
}

export async function listTournaments(): Promise<ListTournamentsResult> {
  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.from(TABLE).select("*").order("start_date", { ascending: true });
    if (error) {
      return {
        ok: false,
        error: missingTable(error.message)
          ? "Tournaments table is not available. Apply supabase/migrations/0021_recruiting_tournaments.sql."
          : error.message,
      };
    }
    const tournaments = ((data as RecruitingTournamentRow[] | null) ?? []).map((row) => rowToTournament(row));
    return { ok: true, tournaments: await attachLinkedRecruits(tournaments) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to load tournaments." };
  }
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new TournamentRepositoryError(`Failed to load tournament: ${error.message}`);
  if (!data) return null;
  const [withLinks] = await attachLinkedRecruits([rowToTournament(data as RecruitingTournamentRow)]);
  return withLinks ?? null;
}

export async function saveTournament(id: string | null, input: TournamentInput): Promise<Tournament> {
  const client = await createSupabaseServerClient();
  const payload = inputToRow(input);
  const query = id
    ? client.from(TABLE).update(payload).eq("id", id).select("*").single()
    : client.from(TABLE).insert(payload).select("*").single();
  const { data, error } = await query;
  if (error) throw new TournamentRepositoryError(error.message);
  const [withLinks] = await attachLinkedRecruits([rowToTournament(data as RecruitingTournamentRow)]);
  return withLinks;
}

export async function deleteTournament(id: string): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(TABLE).delete().eq("id", id);
  if (error) throw new TournamentRepositoryError(error.message);
}

export async function linkRecruitsToTournament(
  tournamentId: string,
  personIds: readonly string[],
): Promise<Tournament> {
  const uniqueIds = [...new Set(personIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new TournamentRepositoryError("Tournament not found.");
    return tournament;
  }

  const client = await createSupabaseServerClient();
  const { data: existing, error: existingError } = await client
    .from(LINKS_TABLE)
    .select("recruit_person_id")
    .eq("tournament_id", tournamentId);
  if (existingError) throw new TournamentRepositoryError(existingError.message);

  const already = new Set(
    ((existing as { recruit_person_id: string }[] | null) ?? []).map((row) => row.recruit_person_id),
  );
  const inserts = uniqueIds
    .filter((personId) => !already.has(personId))
    .map((recruit_person_id) => ({
      tournament_id: tournamentId,
      recruit_person_id: recruit_person_id,
      attendance_status: "expected",
    }));

  if (inserts.length > 0) {
    const { error } = await client.from(LINKS_TABLE).insert(inserts);
    if (error) throw new TournamentRepositoryError(error.message);
  }

  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new TournamentRepositoryError("Tournament not found.");
  return tournament;
}

export async function unlinkRecruitFromTournament(
  tournamentId: string,
  personId: string,
): Promise<Tournament> {
  const client = await createSupabaseServerClient();
  const { error } = await client
    .from(LINKS_TABLE)
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("recruit_person_id", personId);
  if (error) throw new TournamentRepositoryError(error.message);
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new TournamentRepositoryError("Tournament not found.");
  return tournament;
}

export async function updateTournamentRecruitLink(
  tournamentId: string,
  personId: string,
  patch: { attendanceStatus: AttendanceStatus; notes: string | null },
): Promise<Tournament> {
  const client = await createSupabaseServerClient();
  const { error } = await client
    .from(LINKS_TABLE)
    .update({
      attendance_status: patch.attendanceStatus,
      notes: patch.notes?.trim() || null,
    })
    .eq("tournament_id", tournamentId)
    .eq("recruit_person_id", personId);
  if (error) throw new TournamentRepositoryError(error.message);
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new TournamentRepositoryError("Tournament not found.");
  return tournament;
}
