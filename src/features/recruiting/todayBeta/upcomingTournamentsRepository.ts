/**
 * Recruit upcoming tournaments repository (Today Beta v0.1).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  RecruitUpcomingTournament,
  RecruitUpcomingTournamentInput,
  UpcomingTournamentStatus,
} from "./types";

export class UpcomingTournamentRepositoryError extends Error {}

const TABLE = "recruit_upcoming_tournaments";

type Row = {
  id: string;
  recruit_person_id: string;
  tournament_name: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  event_type: string | null;
  source: string;
  source_url: string | null;
  notes: string | null;
  status: UpcomingTournamentStatus;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): RecruitUpcomingTournament {
  return {
    id: row.id,
    recruitPersonId: row.recruit_person_id,
    tournamentName: row.tournament_name,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    eventType: row.event_type,
    source: row.source,
    sourceUrl: row.source_url,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function writeRow(input: RecruitUpcomingTournamentInput) {
  return {
    recruit_person_id: input.recruitPersonId,
    tournament_name: input.tournamentName.trim(),
    start_date: input.startDate,
    end_date: input.endDate ?? null,
    location: input.location?.trim() || null,
    event_type: input.eventType?.trim() || null,
    source: input.source ?? "MANUAL",
    source_url: input.sourceUrl?.trim() || null,
    notes: input.notes?.trim() || null,
    status: input.status ?? "UPCOMING",
    updated_at: new Date().toISOString(),
  };
}

export async function listRecruitUpcomingTournaments(
  recruitPersonIds?: readonly string[],
): Promise<RecruitUpcomingTournament[]> {
  const client = await createSupabaseServerClient();
  let query = client.from(TABLE).select("*").order("start_date", { ascending: true });

  if (recruitPersonIds && recruitPersonIds.length > 0) {
    query = query.in("recruit_person_id", [...recruitPersonIds]);
  }

  const { data, error } = await query;
  if (error) {
    if (/does not exist|schema cache|could not find/i.test(error.message)) {
      return [];
    }
    throw new UpcomingTournamentRepositoryError(
      `Failed to load upcoming tournaments: ${error.message}`,
    );
  }

  return ((data ?? []) as Row[]).map(mapRow);
}

export async function createRecruitUpcomingTournament(
  input: RecruitUpcomingTournamentInput,
): Promise<RecruitUpcomingTournament> {
  if (!input.recruitPersonId.trim()) {
    throw new UpcomingTournamentRepositoryError("Recruit is required.");
  }
  if (!input.tournamentName.trim()) {
    throw new UpcomingTournamentRepositoryError("Tournament name is required.");
  }
  if (!input.startDate.trim()) {
    throw new UpcomingTournamentRepositoryError("Start date is required.");
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .insert(writeRow(input))
    .select("*")
    .single();

  if (error) {
    throw new UpcomingTournamentRepositoryError(
      `Failed to create upcoming tournament: ${error.message}`,
    );
  }

  return mapRow(data as Row);
}

export async function updateRecruitUpcomingTournament(
  id: string,
  input: RecruitUpcomingTournamentInput,
): Promise<RecruitUpcomingTournament> {
  if (!input.tournamentName.trim()) {
    throw new UpcomingTournamentRepositoryError("Tournament name is required.");
  }
  if (!input.startDate.trim()) {
    throw new UpcomingTournamentRepositoryError("Start date is required.");
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .update(writeRow(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new UpcomingTournamentRepositoryError(
      `Failed to update upcoming tournament: ${error.message}`,
    );
  }

  return mapRow(data as Row);
}

export async function cancelRecruitUpcomingTournament(id: string): Promise<RecruitUpcomingTournament> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new UpcomingTournamentRepositoryError(
      `Failed to cancel upcoming tournament: ${error.message}`,
    );
  }

  return mapRow(data as Row);
}

export function tournamentsByRecruitPersonId(
  tournaments: readonly RecruitUpcomingTournament[],
): Map<string, RecruitUpcomingTournament[]> {
  const map = new Map<string, RecruitUpcomingTournament[]>();
  for (const tournament of tournaments) {
    const bucket = map.get(tournament.recruitPersonId) ?? [];
    bucket.push(tournament);
    map.set(tournament.recruitPersonId, bucket);
  }
  return map;
}
