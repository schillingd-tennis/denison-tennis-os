import { createSupabaseServerClient } from "@/lib/supabase/server";

import { inputToRow, rowToScheduleEvent, type TeamScheduleEventRow } from "./mapping";
import type { TeamScheduleEvent, TeamScheduleEventInput } from "./types";

const TABLE = "team_schedule_events";

export class TeamScheduleRepositoryError extends Error {}

function missingTable(message: string): boolean {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

export async function listScheduleEvents(seasonYear?: number): Promise<TeamScheduleEvent[]> {
  const client = await createSupabaseServerClient();
  let query = client.from(TABLE).select("*");
  if (seasonYear != null) {
    query = query.eq("season_year", seasonYear);
  }
  const { data, error } = await query.order("start_date").order("sort_order");

  if (error) {
    if (missingTable(error.message)) return [];
    throw new TeamScheduleRepositoryError(`Failed to load schedule: ${error.message}`);
  }

  return ((data as TeamScheduleEventRow[] | null) ?? []).map(rowToScheduleEvent);
}

export async function saveScheduleEvent(
  id: string | null,
  input: TeamScheduleEventInput,
): Promise<TeamScheduleEvent> {
  const client = await createSupabaseServerClient();
  const row = inputToRow(input);
  const payload = { ...row, updated_at: new Date().toISOString() };

  if (id) {
    const { data, error } = await client.from(TABLE).update(payload).eq("id", id).select("*").single();
    if (error) throw new TeamScheduleRepositoryError(`Failed to update schedule event: ${error.message}`);
    return rowToScheduleEvent(data as TeamScheduleEventRow);
  }

  const { data, error } = await client.from(TABLE).insert(payload).select("*").single();
  if (error) throw new TeamScheduleRepositoryError(`Failed to create schedule event: ${error.message}`);
  return rowToScheduleEvent(data as TeamScheduleEventRow);
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(TABLE).delete().eq("id", id);
  if (error) throw new TeamScheduleRepositoryError(`Failed to delete schedule event: ${error.message}`);
}

export async function listSeasonYears(): Promise<number[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from(TABLE).select("season_year");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new TeamScheduleRepositoryError(`Failed to load seasons: ${error.message}`);
  }
  const years = new Set(((data as { season_year: number }[] | null) ?? []).map((row) => row.season_year));
  return [...years].sort((a, b) => b - a);
}
