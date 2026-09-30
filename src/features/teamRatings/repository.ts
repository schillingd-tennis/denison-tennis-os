import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { TeamRatingDashboardRow, TeamRatingObservation, TeamRatingPlayer, TeamRatingProvider } from "./types";

type TeamPersonRow = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  utr_url: string | null;
  wtn_url: string | null;
  role: { key: string } | { key: string }[] | null;
  status: { key: string } | { key: string }[] | null;
};

function lookupKey(value: TeamPersonRow["role"]): string | undefined {
  return Array.isArray(value) ? value[0]?.key : value?.key;
}

export function parseExternalPlayerId(provider: TeamRatingProvider, url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (provider === "utr") {
    return trimmed.match(/\/profiles\/(\d+)/i)?.[1] ?? null;
  }
  return trimmed.match(/(?:player|profile)[/=]([a-z0-9-]+)/i)?.[1] ??
    trimmed.match(/[?&](?:id|playerId)=([a-z0-9-]+)/i)?.[1] ?? null;
}

export async function listCurrentTeamRatingPlayers(
  provider: TeamRatingProvider,
): Promise<TeamRatingPlayer[]> {
  const db = await createSupabaseServerClient();
  const urlColumn = provider === "utr" ? "utr_url" : "wtn_url";
  const { data, error } = await db
    .from("production_people")
    .select("id, first_name, last_name, preferred_name, utr_url, wtn_url, role:roles!role_id(key), status:statuses!status_id(key)")
    .not(urlColumn, "is", null);
  if (error) throw new Error(`Failed to load team rating cohort: ${error.message}`);

  return ((data ?? []) as unknown as TeamPersonRow[]).flatMap((row) => {
    if (lookupKey(row.role) !== "player" || lookupKey(row.status) !== "current") return [];
    const profileUrl = provider === "utr" ? row.utr_url : row.wtn_url;
    if (!profileUrl) return [];
    const externalPlayerId = parseExternalPlayerId(provider, profileUrl);
    if (!externalPlayerId) return [];
    return [{
      personId: row.id,
      displayName: `${row.preferred_name?.trim() || row.first_name} ${row.last_name}`.trim(),
      provider,
      externalPlayerId,
      profileUrl,
    }];
  });
}

export async function recordTeamRatingObservation(
  observation: TeamRatingObservation,
  jobId: string,
): Promise<void> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("record_team_player_rating", {
    p_person_id: observation.personId,
    p_provider: observation.provider,
    p_rating: observation.rating,
    p_rating_date: observation.ratingDate,
    p_external_player_id: observation.externalPlayerId,
    p_source_url: observation.profileUrl,
    p_job_id: jobId,
    p_diagnostic: observation.diagnostic ?? null,
  });
  if (error) throw new Error(`Failed to record ${observation.provider.toUpperCase()} rating: ${error.message}`);
}

type DashboardPersonRow = TeamPersonRow & { utr: number | null; wtn: number | null };
type SnapshotRow = {
  person_id: string;
  provider: TeamRatingProvider;
  rating_change: number | null;
  captured_at: string;
};

export async function listTeamRatingDashboard(): Promise<TeamRatingDashboardRow[]> {
  const db = await createSupabaseServerClient();
  const { data: people, error: peopleError } = await db.from("production_people")
    .select("id, first_name, last_name, preferred_name, utr, wtn, utr_url, wtn_url, role:roles!role_id(key), status:statuses!status_id(key)");
  if (peopleError) throw new Error(`Failed to load team ratings: ${peopleError.message}`);

  // Current stored ratings remain useful while migration 0072 is awaiting
  // installation. History/change fields populate as soon as the table exists.
  const { data: snapshots, error: snapshotsError } = await db.from("team_player_rating_snapshots")
    .select("person_id, provider, rating_change, captured_at")
    .order("captured_at", { ascending: false });
  const historyTableMissing = snapshotsError?.code === "42P01" || snapshotsError?.code === "PGRST205";
  if (snapshotsError && !historyTableMissing) {
    throw new Error(`Failed to load rating history: ${snapshotsError.message}`);
  }

  const latest = new Map<string, SnapshotRow>();
  for (const snapshot of (snapshots ?? []) as SnapshotRow[]) {
    const key = `${snapshot.person_id}:${snapshot.provider}`;
    if (!latest.has(key)) latest.set(key, snapshot);
  }
  return ((people ?? []) as unknown as DashboardPersonRow[])
    .filter((person) => lookupKey(person.role) === "player" && lookupKey(person.status) === "current")
    .map((person) => {
      const utrSnapshot = latest.get(`${person.id}:utr`);
      const wtnSnapshot = latest.get(`${person.id}:wtn`);
      return {
        personId: person.id,
        displayName: `${person.preferred_name?.trim() || person.first_name} ${person.last_name}`.trim(),
        utr: person.utr,
        wtn: person.wtn,
        utrUrl: person.utr_url,
        wtnUrl: person.wtn_url,
        utrChange: utrSnapshot?.rating_change ?? null,
        wtnChange: wtnSnapshot?.rating_change ?? null,
        utrCheckedAt: utrSnapshot?.captured_at ?? null,
        wtnCheckedAt: wtnSnapshot?.captured_at ?? null,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function requestTeamRatingJob(provider: TeamRatingProvider): Promise<void> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("request_team_rating_job", { p_provider: provider });
  if (error) throw new Error(`Failed to queue ${provider.toUpperCase()} rating check: ${error.message}`);
}
