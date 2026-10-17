import { listPeople } from "@/features/people/repository";
import { getDisplayName, getHometown, getInitials } from "@/features/people/utils";
import { listRecruitProfiles } from "@/features/recruiting/repository";
import { RECRUIT_PIPELINE_SEED } from "@/features/recruiting/lookupSeed";
import { ROLE_KEYS, STATUS_KEYS, roleIdForKey, statusIdForKey } from "@/features/lookups/seed";
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
  TournamentRecruitEnrichmentSummary,
} from "./types";
import { indexRecruitNames, normalizeRecruitName, splitParticipantName } from "./participantRecruitMatching";
import { calculateTournamentDistance } from "./distance";
import { lifecycleStatusForDates } from "./location";

const TABLE = "recruiting_tournaments";
const LINKS_TABLE = "recruiting_tournament_recruits";
const PARTICIPANTS_TABLE = "recruiting_tournament_participants";

export class TournamentRepositoryError extends Error {}

type TournamentParticipantRow = {
  id: string;
  tournament_id: string;
  recruit_person_id: string | null;
  recruit_link_status?: TournamentParticipant["recruitLinkStatus"] | null;
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
  trn_url?: string | null;
  trn_rank?: number | null;
  trn_star_rating?: number | null;
  class_year?: number | null;
};

type ParticipantTrnDetails = Pick<TournamentParticipant, "trnRank" | "trnStarRating" | "trnUrl" | "classYear">;

const EMPTY_TRN_DETAILS: ParticipantTrnDetails = {
  trnRank: null,
  trnStarRating: null,
  trnUrl: null,
  classYear: null,
};

function participantFromRow(
  row: TournamentParticipantRow,
  trnDetails: ParticipantTrnDetails = EMPTY_TRN_DETAILS,
): TournamentParticipant {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    recruitPersonId: row.recruit_person_id,
    recruitLinkStatus: row.recruit_link_status ?? (row.recruit_person_id ? "matched" : "unmatched"),
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
    trnRank: trnDetails.trnRank ?? row.trn_rank ?? null,
    trnStarRating: trnDetails.trnStarRating ?? row.trn_star_rating ?? null,
    trnUrl: trnDetails.trnUrl ?? row.trn_url ?? null,
    classYear: trnDetails.classYear ?? row.class_year ?? null,
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
  const rows = (data as TournamentParticipantRow[] | null) ?? [];
  const linkedPersonIds = new Set(rows.flatMap((row) => row.recruit_person_id ? [row.recruit_person_id] : []));
  if (linkedPersonIds.size === 0) return rows.map((row) => participantFromRow(row));

  const [people, profiles] = await Promise.all([listPeople(), listRecruitProfiles()]);
  const classYearByPersonId = new Map(profiles.map((profile) => [profile.personId, profile.recruitClassYear ?? null]));
  const trnByPersonId = new Map<string, ParticipantTrnDetails>();
  for (const person of people) {
    if (!linkedPersonIds.has(person.id)) continue;
    trnByPersonId.set(person.id, {
      trnRank: person.trnRank ?? null,
      trnStarRating: person.trnStarRating ?? null,
      trnUrl: person.trnUrl ?? null,
      classYear: classYearByPersonId.get(person.id) ?? null,
    });
  }
  return rows.map((row) => participantFromRow(
    row,
    row.recruit_person_id ? trnByPersonId.get(row.recruit_person_id) : undefined,
  ));
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
    const tournaments = ((data as RecruitingTournamentRow[] | null) ?? []).map((row) => {
      const tournament = rowToTournament(row);
      return { ...tournament, lifecycleStatus: lifecycleStatusForDates(tournament.startDate, tournament.endDate) };
    });
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
  const mapped = rowToTournament(data as RecruitingTournamentRow);
  const [withLinks] = await attachLinkedRecruits([{ ...mapped, lifecycleStatus: lifecycleStatusForDates(mapped.startDate, mapped.endDate) }]);
  if (!withLinks) return null;
  return { ...withLinks, participants: await listTournamentParticipants(id) };
}

export async function importTournamentParticipants(
  tournamentId: string,
  participants: readonly TournamentParticipantInput[],
): Promise<TournamentParticipant[]> {
  if (participants.length === 0) return listTournamentParticipants(tournamentId);
  const client = await createSupabaseServerClient();
  const [people, profiles] = await Promise.all([listPeople(), listRecruitProfiles()]);
  const recruitIds = new Set(profiles.map((profile) => profile.personId));
  const nameIndex = indexRecruitNames(people.filter((person) => recruitIds.has(person.id)).map((person) => ({ personId: person.id, displayName: getDisplayName(person) })));
  const rows: Array<Record<string, unknown>> = [];
  const links: Array<{ tournament_id: string; recruit_person_id: string; attendance_status: "expected" }> = [];

  for (const participant of participants) {
    const matches = nameIndex.get(normalizeRecruitName(participant.participantName)) ?? [];
    let recruitPersonId: string | null = null;
    let recruitLinkStatus: TournamentParticipant["recruitLinkStatus"] = "unmatched";
    if (matches.length === 1) {
      recruitPersonId = matches[0]?.personId ?? null;
      recruitLinkStatus = "matched";
    } else if (matches.length > 1) {
      recruitLinkStatus = "ambiguous";
    }
    if (recruitPersonId) links.push({ tournament_id: tournamentId, recruit_person_id: recruitPersonId, attendance_status: "expected" });
    rows.push({ tournament_id: tournamentId, participant_name: participant.participantName.trim(), events: participant.events, city: participant.city, state: participant.state, gender: participant.gender, recruit_person_id: recruitPersonId, recruit_link_status: recruitLinkStatus });
  }
  const { error } = await client
    .from(PARTICIPANTS_TABLE)
    .upsert(rows, { onConflict: "tournament_id,participant_name", ignoreDuplicates: false });
  if (error) throw new TournamentRepositoryError(`Could not import participants: ${error.message}`);
  if (links.length > 0) {
    const { error: linkError } = await client.from(LINKS_TABLE).upsert(links, { onConflict: "tournament_id,recruit_person_id", ignoreDuplicates: true });
    if (linkError) throw new TournamentRepositoryError(`Could not link tournament recruits: ${linkError.message}`);
  }
  const { error: queueError } = await client.rpc("request_tournament_trn_profile_job", { p_tournament_id: tournamentId });
  // Importing the field is the primary operation. A transient worker/queue
  // problem must not turn a successful import into an apparent failure or
  // prevent the client from refreshing the newly inserted players.
  if (queueError) console.error(`Tournament players imported without queued TRN enrichment: ${queueError.message}`);
  return listTournamentParticipants(tournamentId);
}

export async function promoteTournamentParticipants(
  tournamentId: string,
  participantIds: readonly string[],
): Promise<{ created: number; participants: TournamentParticipant[] }> {
  if (participantIds.length === 0) return { created: 0, participants: await listTournamentParticipants(tournamentId) };
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from(PARTICIPANTS_TABLE).select("*").eq("tournament_id", tournamentId).in("id", [...participantIds]);
  if (error) throw new TournamentRepositoryError(`Could not load selected tournament players: ${error.message}`);
  const potentialStage = RECRUIT_PIPELINE_SEED.find((stage) => stage.key === "potential");
  let created = 0;
  for (const row of ((data as TournamentParticipantRow[] | null) ?? [])) {
    if (row.recruit_person_id) continue;
    const { firstName, lastName } = splitParticipantName(row.participant_name);
    const personId = crypto.randomUUID();
    const { error: personError } = await client.from("production_people").insert({
      id: personId,
      role_id: roleIdForKey(ROLE_KEYS.recruit),
      status_id: statusIdForKey(STATUS_KEYS.current),
      first_name: firstName,
      last_name: lastName,
      city: row.city,
      state: row.state,
      trn_url: row.trn_url ?? null,
      trn_rank: row.trn_rank ?? null,
      trn_star_rating: row.trn_star_rating ?? null,
      relationships: [],
    });
    if (personError) throw new TournamentRepositoryError(`Could not add ${row.participant_name}: ${personError.message}`);
    const { error: profileError } = await client.from("recruit_profiles").insert({
      person_id: personId,
      pipeline_stage_id: potentialStage?.id ?? null,
      recruit_class_year: row.class_year ?? null,
      notes: "Promoted from a tournament player review pool.",
    });
    if (profileError) throw new TournamentRepositoryError(`Could not create Potential recruit ${row.participant_name}: ${profileError.message}`);
    const { error: participantError } = await client.from(PARTICIPANTS_TABLE).update({ recruit_person_id: personId, recruit_link_status: "created" }).eq("id", row.id);
    if (participantError) throw new TournamentRepositoryError(`Could not link ${row.participant_name}: ${participantError.message}`);
    const { error: linkError } = await client.from(LINKS_TABLE).upsert({ tournament_id: tournamentId, recruit_person_id: personId, attendance_status: "expected" }, { onConflict: "tournament_id,recruit_person_id" });
    if (linkError) throw new TournamentRepositoryError(`Could not connect ${row.participant_name} to the tournament: ${linkError.message}`);
    created += 1;
  }
  return { created, participants: await listTournamentParticipants(tournamentId) };
}

export async function addPotentialRecruitsAndEnrich(tournamentId: string): Promise<TournamentRecruitEnrichmentSummary> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from(PARTICIPANTS_TABLE).select("*").eq("tournament_id", tournamentId);
  if (error) throw new TournamentRepositoryError(`Could not load tournament players: ${error.message}`);
  const rows = (data as TournamentParticipantRow[] | null) ?? [];
  const [people, profiles] = await Promise.all([listPeople(), listRecruitProfiles()]);
  const recruitIds = new Set(profiles.map((profile) => profile.personId));
  const nameIndex = indexRecruitNames(people.filter((person) => recruitIds.has(person.id)).map((person) => ({ personId: person.id, displayName: getDisplayName(person) })));
  for (const row of rows) {
    if (row.recruit_person_id) continue;
    const matches = nameIndex.get(normalizeRecruitName(row.participant_name)) ?? [];
    if (matches.length === 1 && matches[0]) {
      const personId = matches[0].personId;
      const { error: matchError } = await client.from(PARTICIPANTS_TABLE).update({ recruit_person_id: personId, recruit_link_status: "matched" }).eq("id", row.id);
      if (matchError) throw new TournamentRepositoryError(`Could not link ${row.participant_name}: ${matchError.message}`);
      await client.from(LINKS_TABLE).upsert({ tournament_id: tournamentId, recruit_person_id: personId, attendance_status: "expected" }, { onConflict: "tournament_id,recruit_person_id", ignoreDuplicates: true });
    } else if (matches.length > 1 && row.recruit_link_status !== "ambiguous") {
      await client.from(PARTICIPANTS_TABLE).update({ recruit_link_status: "ambiguous" }).eq("id", row.id);
    }
  }
  const queued = rows.filter((row) => !row.trn_url && !row.trn_rank).length;
  if (queued > 0) {
    const { error: queueError } = await client.rpc("request_tournament_trn_profile_job", { p_tournament_id: tournamentId });
    if (queueError) throw new TournamentRepositoryError(`The tournament field was matched, but public TRN enrichment could not be queued: ${queueError.message}`);
  }
  return { created: 0, enriched: 0, queued, unresolved: [], participants: await listTournamentParticipants(tournamentId) };
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
  const calculatedDistance = await calculateTournamentDistance(input);
  const normalizedInput: TournamentInput = {
    ...input,
    lifecycleStatus: lifecycleStatusForDates(input.startDate, input.endDate),
    distanceFromColumbus: calculatedDistance === null ? input.distanceFromColumbus : String(calculatedDistance),
  };
  const payload = inputToRow(normalizedInput);
  const query = id
    ? client.from(TABLE).update(payload).eq("id", id).select("*").single()
    : client.from(TABLE).insert(payload).select("*").single();
  const { data, error } = await query;
  if (error) throw new TournamentRepositoryError(error.message);
  const [withLinks] = await attachLinkedRecruits([rowToTournament(data as RecruitingTournamentRow)]);
  return withLinks;
}

export async function setTournamentPlanToAttend(
  tournamentId: string,
  planToAttend: boolean,
): Promise<Tournament> {
  const client = await createSupabaseServerClient();
  const { error } = await client
    .from(TABLE)
    .update({ recruiting_plan: planToAttend ? "traveling" : "watching" })
    .eq("id", tournamentId);
  if (error) throw new TournamentRepositoryError(error.message);
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new TournamentRepositoryError("Tournament not found.");
  return tournament;
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
