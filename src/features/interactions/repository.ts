import { listPeople } from "@/features/people/repository";
import { filterVisibleRecruitingInteractions } from "@/features/recruiting/eligibility";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { InteractionType, RecruitInteraction, RecruitInteractionInput } from "./types";

type Row = {
  id: string; recruit_person_id: string; tournament_id: string | null; occurred_at: string;
  interaction_type: InteractionType; channel: string | null; direction: RecruitInteraction["direction"];
  participants: string | null; notes: string | null; next_steps: string | null; logged_by: string | null;
  source_system: string | null; source_key: string | null; created_at: string; updated_at: string;
  recruit?: { first_name: string | null; last_name: string | null; preferred_name: string | null } | null;
  tournament?: { name: string } | null;
};

const SELECT = `*, recruit:production_people!recruit_person_id(first_name,last_name,preferred_name), tournament:recruiting_tournaments!tournament_id(name)`;
function map(row: Row): RecruitInteraction {
  const first = row.recruit?.preferred_name?.trim() || row.recruit?.first_name?.trim() || "Unknown";
  const last = row.recruit?.last_name?.trim() || "recruit";
  return {
    id: row.id, recruitPersonId: row.recruit_person_id, recruitName: `${first} ${last}`,
    tournamentId: row.tournament_id, tournamentName: row.tournament?.name ?? null,
    occurredAt: row.occurred_at, interactionType: row.interaction_type, channel: row.channel,
    direction: row.direction, participants: row.participants, notes: row.notes, nextSteps: row.next_steps,
    loggedBy: row.logged_by, sourceSystem: row.source_system, sourceKey: row.source_key,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listRecruitInteractions(personId?: string): Promise<RecruitInteraction[]> {
  const client = await createSupabaseServerClient();
  let query = client.from("recruiting_interactions").select(SELECT).order("occurred_at", { ascending: false }).limit(5000);
  if (personId) query = query.eq("recruit_person_id", personId);
  const { data, error } = await query;
  if (error) {
    if (/does not exist|schema cache|could not find/i.test(error.message)) return [];
    throw new Error(`Failed to load interactions: ${error.message}`);
  }
  return ((data ?? []) as unknown as Row[]).map(map);
}

/** Central Recruiting lists/counts: hide current-team members without deleting rows. */
export async function listVisibleRecruitingInteractions(): Promise<RecruitInteraction[]> {
  const [interactions, people] = await Promise.all([listRecruitInteractions(), listPeople()]);
  return filterVisibleRecruitingInteractions(interactions, new Map(people.map((person) => [person.id, person])));
}

function writeRow(input: RecruitInteractionInput) {
  return {
    recruit_person_id: input.recruitPersonId,
    tournament_id: input.tournamentId,
    occurred_at: input.occurredAt,
    interaction_type: input.interactionType,
    channel: input.channel,
    direction: input.direction,
    participants: input.participants,
    notes: input.notes,
    next_steps: input.nextSteps,
    logged_by: input.loggedBy,
    source_system: input.sourceSystem ?? null,
    source_key: input.sourceKey ?? null,
  };
}

export async function getRecruitInteraction(id: string): Promise<RecruitInteraction | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("recruiting_interactions").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load interaction: ${error.message}`);
  return data ? map(data as unknown as Row) : null;
}

export async function createRecruitInteraction(input: RecruitInteractionInput): Promise<RecruitInteraction> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("recruiting_interactions").insert(writeRow(input)).select(SELECT).single();
  if (error) throw new Error(`Failed to create interaction: ${error.message}`);
  return map(data as unknown as Row);
}

export async function updateRecruitInteraction(
  id: string,
  input: RecruitInteractionInput,
): Promise<RecruitInteraction> {
  const client = await createSupabaseServerClient();
  const existing = await getRecruitInteraction(id);
  if (!existing) throw new Error("Interaction not found.");
  const { data, error } = await client
    .from("recruiting_interactions")
    .update(writeRow(input))
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw new Error(`Failed to update interaction: ${error.message}`);
  return map(data as unknown as Row);
}

export async function deleteRecruitInteraction(id: string): Promise<RecruitInteraction> {
  const existing = await getRecruitInteraction(id);
  if (!existing) throw new Error("Interaction not found.");
  const client = await createSupabaseServerClient();
  const { error } = await client.from("recruiting_interactions").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete interaction: ${error.message}`);
  return existing;
}
