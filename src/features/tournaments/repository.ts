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
  TournamentParticipant,
  TournamentParticipantEvaluation,
  TournamentParticipantInput,
} from "./types";

const TABLE = "recruiting_tournaments";
const LINKS_TABLE = "recruiting_tournament_recruits";
const PARTICIPANTS_TABLE = "recruiting_tournament_participants";

export class TournamentRepositoryError extends Error {}

type TournamentParticipantRow = {
  id: string;
  tournament_id: string;
  recruit_person_id: string | null;
  participant_name: string;
  events: string[] | null;
  city: string | null;
  state: string | null;
  gender: string | null;
  evaluation_status: TournamentParticipant["evaluationStatus"];
  overall_rating: number | null;
  quick_tags: string[] | null;
  evaluation_notes: string | null;
  evaluated_at: string | null;
};

function participantFromRow(row: TournamentParticipantRow): TournamentParticipant {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    recruitPersonId: row.recruit_person_id,
    participantName: row.participant_name,
    events: row.events ?? [],
    city: row.city,
    state: row.state,
    gender: row.gender,
    evaluationStatus: row.evaluation_status,
    overallRating: row.overall_rating,
    quickTags: row.quick_tags ?? [],
    evaluationNotes: row.evaluation_notes,
    evaluatedAt: row.evaluated_at,
  };
}

async function listTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(PARTICIPANTS_TABLE)
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("participant_name", { ascending: true });
  if (error) {
    if (missingTable(error.message)) return [];
    throw new TournamentRepositoryError(`Failed to load tournament participants: ${error.message}`);
  }
  return ((data as TournamentParticipantRow[] | null) ?? []).map(participantFromRow);
}

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

  let people: Awaited<ReturnType<typeof listPeople>>;
  let profiles: Awaited<ReturnType<typeof listRecruitProfiles>>;
  try {
    [people, profiles] = await Promise.all([listPeople(), listRecruitProfiles()]);
  } catch (error) {
    // Recruit enrichment is helpful but must not make the tournament directory
    // unavailable when a local Supabase session is stale or its clock has drifted.
    if (error instanceof Error && /jwt issued at future|jwt expired|invalid jwt/i.test(error.message)) {
      return tournaments;
    }
    throw error;
  }
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
  if (!withLinks) return null;
  return { ...withLinks, participants: await listTournamentParticipants(id) };
}

export async function importTournamentParticipants(
  tournamentId: string,
  participants: readonly TournamentParticipantInput[],
): Promise<TournamentParticipant[]> {
  if (participants.length === 0) return listTournamentParticipants(tournamentId);
  const client = await createSupabaseServerClient();
  const rows = participants.map((participant) => ({
    tournament_id: tournamentId,
    participant_name: participant.participantName.trim(),
    events: participant.events,
    city: participant.city,
    state: participant.state,
    gender: participant.gender,
  }));
  const { error } = await client
    .from(PARTICIPANTS_TABLE)
    .upsert(rows, { onConflict: "tournament_id,participant_name", ignoreDuplicates: false });
  if (error) throw new TournamentRepositoryError(`Could not import participants: ${error.message}`);
  return listTournamentParticipants(tournamentId);
}

export async function saveTournamentParticipantEvaluation(
  participantId: string,
  evaluation: TournamentParticipantEvaluation,
): Promise<TournamentParticipant> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(PARTICIPANTS_TABLE)
    .update({
      evaluation_status: evaluation.evaluationStatus,
      overall_rating: evaluation.overallRating,
      quick_tags: evaluation.quickTags,
      evaluation_notes: evaluation.evaluationNotes?.trim() || null,
      evaluated_at: evaluation.evaluationStatus === "not_evaluated" ? null : new Date().toISOString(),
    })
    .eq("id", participantId)
    .select("*")
    .single();
  if (error) throw new TournamentRepositoryError(`Could not save evaluation: ${error.message}`);
  return participantFromRow(data as TournamentParticipantRow);
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
