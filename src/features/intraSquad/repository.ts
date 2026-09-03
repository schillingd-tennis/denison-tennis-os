import { createSupabaseServerClient } from "@/lib/supabase/server";

import { sortMatchesNewestFirst } from "./display";
import { inputToRow, rowToIntraSquadMatch, type IntraSquadMatchRow } from "./mapping";
import { IntraSquadRepositoryError } from "./persistErrors";
import type { IntraSquadMatch, IntraSquadMatchInput } from "./types";

const TABLE = "intra_squad_matches";

export { IntraSquadRepositoryError };

function missingTable(message: string): boolean {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

function summarizePayload(row: ReturnType<typeof inputToRow>): string {
  return JSON.stringify({
    status: row.status ?? "completed",
    played_at: row.played_at,
    winner_player_id: row.winner_player_id,
    loser_player_id: row.loser_player_id,
    leader_player_id: row.leader_player_id ?? null,
    trailing_player_id: row.trailing_player_id ?? null,
    score_text: row.score_text,
    weight: row.weight,
  });
}

function throwPersistError(
  action: "create" | "update" | "delete" | "load",
  error: { message: string; code?: string; details?: string; hint?: string },
  payloadSummary?: string,
): never {
  const parts = [
    action === "create"
      ? "Failed to create intra-squad match"
      : action === "update"
        ? "Failed to update intra-squad match"
        : action === "delete"
          ? "Failed to delete intra-squad match"
          : "Failed to load intra-squad matches",
    error.message,
  ];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.details) parts.push(`details=${error.details}`);
  if (error.hint) parts.push(`hint=${error.hint}`);
  throw new IntraSquadRepositoryError(parts.join(" | "), {
    code: error.code,
    details: error.details,
    hint: error.hint,
    payloadSummary,
  });
}

export async function listIntraSquadMatches(): Promise<IntraSquadMatch[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .order("played_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (missingTable(error.message)) return [];
    throwPersistError("load", error);
  }

  return sortMatchesNewestFirst(((data as IntraSquadMatchRow[] | null) ?? []).map(rowToIntraSquadMatch));
}

export async function saveIntraSquadMatch(
  id: string | null,
  input: IntraSquadMatchInput,
): Promise<IntraSquadMatch> {
  const client = await createSupabaseServerClient();
  const row = inputToRow(input);
  // Explicit nulls (never undefined) so status-aware columns clear correctly.
  const payload = {
    played_at: row.played_at,
    status: row.status ?? "completed",
    winner_player_id: row.winner_player_id ?? null,
    loser_player_id: row.loser_player_id ?? null,
    leader_player_id: row.leader_player_id ?? null,
    trailing_player_id: row.trailing_player_id ?? null,
    score_text: row.score_text,
    score_sets: row.score_sets,
    weight: row.weight,
    source_text: row.source_text ?? null,
    updated_at: new Date().toISOString(),
  };
  const payloadSummary = summarizePayload(row);

  if (id) {
    const { data, error } = await client.from(TABLE).update(payload).eq("id", id).select("*").single();
    if (error) throwPersistError("update", error, payloadSummary);
    return rowToIntraSquadMatch(data as IntraSquadMatchRow);
  }

  const { data, error } = await client.from(TABLE).insert(payload).select("*").single();
  if (error) throwPersistError("create", error, payloadSummary);
  return rowToIntraSquadMatch(data as IntraSquadMatchRow);
}

export async function deleteIntraSquadMatch(id: string): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(TABLE).delete().eq("id", id);
  if (error) throwPersistError("delete", error);
}
