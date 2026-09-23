import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  mapDirectReport,
  mapFormLink,
  mapFormSubmission,
  mapPlayer,
  mapPlayerReport,
  mapTeam,
  mapTeamReport,
  type DirectReportRow,
  type FormLinkRow,
  type FormSubmissionRow,
  type PlayerReportRow,
  type PlayerRow,
  type TeamReportRow,
  type TeamRow,
} from "./mapScouting";
import { hashScoutingFormToken, mintScoutingFormToken } from "./formTokens";
import type {
  FormSubmissionStatus,
  ScoutingDirectReport,
  ScoutingFormLink,
  ScoutingFormSubmission,
  ScoutingOpponentPlayer,
  ScoutingPlayerReport,
  ScoutingTeam,
  ScoutingTeamReport,
} from "./types";
import type { ScoutEvidence } from "./aiSummarize";
import { summarizeScoutingWithOpenAi, type ScoutSummarizeFn } from "./aiSummarize";
import { playerIdsToMarkAiStale, selectPlayerAiEvidenceReports } from "./overviewMetrics";

function missingTable(message: string) {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

/** Anon client for public SECURITY DEFINER RPCs (no user session required). */
function createAnonClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function listScoutingTeams(): Promise<ScoutingTeam[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("scouting_teams").select("*").order("display_name");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load scouting teams: ${error.message}`);
  }
  const teams = (data as TeamRow[] | null) ?? [];
  const [{ data: players, error: playersError }, { data: reports, error: reportsError }] =
    await Promise.all([
      client.from("scouting_opponent_players").select("id, team_id, archived_at"),
      client.from("scouting_direct_reports").select("id, team_id"),
    ]);
  if (playersError) {
    if (missingTable(playersError.message)) {
      return teams.map((team) => mapTeam(team));
    }
    // Fail loud — never silently zero-out player counts (e.g. missing archived_at before 0059).
    throw new Error(`Failed to load opponent player counts: ${playersError.message}`);
  }
  if (reportsError) {
    if (!missingTable(reportsError.message)) {
      throw new Error(`Failed to load scouting report counts: ${reportsError.message}`);
    }
  }
  const playerCounts = new Map<string, number>();
  const archivedPlayerCounts = new Map<string, number>();
  for (const row of players ?? []) {
    // Active = archived_at IS NULL (strict null check; never truthiness on timestamps).
    if (row.archived_at != null) {
      archivedPlayerCounts.set(row.team_id, (archivedPlayerCounts.get(row.team_id) ?? 0) + 1);
    } else {
      playerCounts.set(row.team_id, (playerCounts.get(row.team_id) ?? 0) + 1);
    }
  }
  const reportCounts = new Map<string, number>();
  for (const row of reports ?? []) {
    reportCounts.set(row.team_id, (reportCounts.get(row.team_id) ?? 0) + 1);
  }
  return teams.map((team) =>
    mapTeam(team, {
      playerCount: playerCounts.get(team.id) ?? 0,
      archivedPlayerCount: archivedPlayerCounts.get(team.id) ?? 0,
      reportCount: reportCounts.get(team.id) ?? 0,
    }),
  );
}

export type OpponentPlayerListScope = "active" | "archived" | "all";

/**
 * Loads opponent players. Active scope excludes archived_at IS NOT NULL
 * (repository-level exclusion for the default Team AW / Opponent Players view).
 */
export async function listOpponentPlayers(
  scope: OpponentPlayerListScope = "all",
): Promise<ScoutingOpponentPlayer[]> {
  const client = await createSupabaseServerClient();
  let query = client
    .from("scouting_opponent_players")
    .select("*, scouting_teams(display_name)")
    .order("display_name");
  if (scope === "active") {
    query = query.is("archived_at", null);
  } else if (scope === "archived") {
    query = query.not("archived_at", "is", null);
  }
  const { data, error } = await query;
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load opponent players: ${error.message}`);
  }
  const players = (data as PlayerRow[] | null) ?? [];
  const [{ data: reports }, { data: aiReports }] = await Promise.all([
    client.from("scouting_direct_reports").select("id, opponent_player_id"),
    client
      .from("scouting_player_reports")
      .select("opponent_player_id, stale")
      .eq("kind", "ai_generated"),
  ]);
  const reportCounts = new Map<string, number>();
  for (const row of reports ?? []) {
    if (!row.opponent_player_id) continue;
    reportCounts.set(row.opponent_player_id, (reportCounts.get(row.opponent_player_id) ?? 0) + 1);
  }
  const aiByPlayer = new Map<string, boolean>();
  for (const row of aiReports ?? []) {
    aiByPlayer.set(row.opponent_player_id, Boolean(row.stale));
  }
  return players.map((player) =>
    mapPlayer(player, {
      directReportCount: reportCounts.get(player.id) ?? 0,
      hasAiReport: aiByPlayer.has(player.id),
      aiStale: aiByPlayer.get(player.id) ?? false,
    }),
  );
}

export async function listDirectReports(): Promise<ScoutingDirectReport[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("scouting_direct_reports")
    .select("*, scouting_teams(display_name)")
    .order("match_date", { ascending: false, nullsFirst: false });
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load match reports: ${error.message}`);
  }
  return ((data as DirectReportRow[] | null) ?? []).map(mapDirectReport);
}

export async function listFormSubmissions(): Promise<ScoutingFormSubmission[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("scouting_form_submissions")
    .select(
      "*, resolved_team:scouting_teams!scouting_form_submissions_resolved_team_id_fkey(display_name), resolved_player:scouting_opponent_players!scouting_form_submissions_resolved_opponent_player_id_fkey(display_name)",
    )
    .order("created_at", { ascending: false });
  if (error) {
    // Fallback when FKs / columns from 0068 are not present yet.
    const fallback = await client
      .from("scouting_form_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (fallback.error) {
      if (missingTable(fallback.error.message) || missingTable(error.message)) return [];
      throw new Error(`Failed to load form submissions: ${error.message}`);
    }
    return ((fallback.data as FormSubmissionRow[] | null) ?? []).map(mapFormSubmission);
  }
  return ((data as FormSubmissionRow[] | null) ?? []).map(mapFormSubmission);
}

export async function listFormLinks(): Promise<ScoutingFormLink[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("scouting_form_links")
    .select("id, label, team_id, opponent_player_id, expires_at, revoked_at, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load form links: ${error.message}`);
  }
  return ((data as FormLinkRow[] | null) ?? []).map((row) => mapFormLink(row));
}

export async function getPlayerWorkspace(playerId: string): Promise<{
  player: ScoutingOpponentPlayer | null;
  directReports: ScoutingDirectReport[];
  manualReport: ScoutingPlayerReport | null;
  aiReport: ScoutingPlayerReport | null;
}> {
  const client = await createSupabaseServerClient();
  const { data: playerRow, error } = await client
    .from("scouting_opponent_players")
    .select("*, scouting_teams(display_name)")
    .eq("id", playerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!playerRow) {
    return { player: null, directReports: [], manualReport: null, aiReport: null };
  }

  const [{ data: reports }, { data: consolidated }] = await Promise.all([
    client
      .from("scouting_direct_reports")
      .select("*, scouting_teams(display_name)")
      .eq("opponent_player_id", playerId)
      .order("match_date", { ascending: false, nullsFirst: false }),
    client.from("scouting_player_reports").select("*").eq("opponent_player_id", playerId),
  ]);

  const mappedReports = ((reports as DirectReportRow[] | null) ?? []).map(mapDirectReport);
  const playerReports = ((consolidated as PlayerReportRow[] | null) ?? []).map(mapPlayerReport);

  return {
    player: mapPlayer(playerRow as PlayerRow, {
      directReportCount: mappedReports.length,
      hasAiReport: playerReports.some((report) => report.kind === "ai_generated"),
      aiStale: playerReports.find((report) => report.kind === "ai_generated")?.stale ?? false,
    }),
    directReports: mappedReports,
    manualReport: playerReports.find((report) => report.kind === "manual") ?? null,
    aiReport: playerReports.find((report) => report.kind === "ai_generated") ?? null,
  };
}

export async function getTeamWorkspace(teamId: string): Promise<{
  team: ScoutingTeam | null;
  players: ScoutingOpponentPlayer[];
  directReports: ScoutingDirectReport[];
  teamReports: ScoutingTeamReport[];
}> {
  const client = await createSupabaseServerClient();
  const { data: teamRow, error } = await client
    .from("scouting_teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!teamRow) {
    return { team: null, players: [], directReports: [], teamReports: [] };
  }

  const players = (await listOpponentPlayers("active")).filter((player) => player.teamId === teamId);
  const archivedPlayers = (await listOpponentPlayers("archived")).filter(
    (player) => player.teamId === teamId,
  );
  const directReports = (await listDirectReports()).filter((report) => report.teamId === teamId);
  const { data: reports } = await client
    .from("scouting_team_reports")
    .select("*")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  return {
    team: mapTeam(teamRow as TeamRow, {
      playerCount: players.length,
      archivedPlayerCount: archivedPlayers.length,
      reportCount: directReports.length,
    }),
    players,
    directReports,
    teamReports: ((reports as TeamReportRow[] | null) ?? []).map(mapTeamReport),
  };
}

export async function saveDirectReport(
  id: string | null,
  payload: Record<string, unknown>,
): Promise<ScoutingDirectReport> {
  const client = await createSupabaseServerClient();
  let previousOpponentPlayerId: string | null = null;
  if (id) {
    const { data: existing } = await client
      .from("scouting_direct_reports")
      .select("opponent_player_id")
      .eq("id", id)
      .maybeSingle();
    previousOpponentPlayerId = (existing?.opponent_player_id as string | null) ?? null;
  }

  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
    user_edited_at: new Date().toISOString(),
    source_key:
      id == null
        ? createHash("md5")
            .update(`coach_entry:${randomBytes(16).toString("hex")}`)
            .digest("hex")
        : undefined,
  };
  const query = id
    ? client.from("scouting_direct_reports").update(row).eq("id", id).select("*, scouting_teams(display_name)").single()
    : client.from("scouting_direct_reports").insert(row).select("*, scouting_teams(display_name)").single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const mapped = mapDirectReport(data as DirectReportRow);
  const nextOpponentPlayerId =
    mapped.opponentPlayerId ??
    (typeof payload.opponent_player_id === "string" ? payload.opponent_player_id : null);
  await markPlayersAiStale(
    playerIdsToMarkAiStale(previousOpponentPlayerId, nextOpponentPlayerId),
  );
  return mapped;
}

export async function deleteDirectReport(id: string): Promise<void> {
  const client = await createSupabaseServerClient();
  const { data: existing, error: loadError } = await client
    .from("scouting_direct_reports")
    .select("opponent_player_id")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  const previousOpponentPlayerId = (existing?.opponent_player_id as string | null) ?? null;
  const { error } = await client.from("scouting_direct_reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await markPlayersAiStale(playerIdsToMarkAiStale(previousOpponentPlayerId, null));
}

async function markPlayersAiStale(opponentPlayerIds: string[]) {
  if (!opponentPlayerIds.length) return;
  const client = await createSupabaseServerClient();
  await client
    .from("scouting_player_reports")
    .update({ stale: true, updated_at: new Date().toISOString() })
    .in("opponent_player_id", opponentPlayerIds)
    .eq("kind", "ai_generated");
}

export async function saveManualPlayerReport(
  opponentPlayerId: string,
  body: string,
): Promise<ScoutingPlayerReport> {
  const client = await createSupabaseServerClient();
  const { data: existing } = await client
    .from("scouting_player_reports")
    .select("id")
    .eq("opponent_player_id", opponentPlayerId)
    .eq("kind", "manual")
    .maybeSingle();

  const row = {
    opponent_player_id: opponentPlayerId,
    kind: "manual",
    body,
    status: "reviewed",
    stale: false,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const query = existing?.id
    ? client.from("scouting_player_reports").update(row).eq("id", existing.id).select("*").single()
    : client.from("scouting_player_reports").insert(row).select("*").single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapPlayerReport(data as PlayerReportRow);
}

export async function regeneratePlayerAiReport(
  opponentPlayerId: string,
  summarize: ScoutSummarizeFn = summarizeScoutingWithOpenAi,
): Promise<ScoutingPlayerReport | { error: string }> {
  const workspace = await getPlayerWorkspace(opponentPlayerId);
  if (!workspace.player) return { error: "Player not found." };
  // Archived opponents keep existing AI readable; restore before new generation.
  if (workspace.player.archivedAt) {
    return { error: "Restore this opponent before generating a new AI summary." };
  }
  const evidenceReports = selectPlayerAiEvidenceReports({
    playerId: opponentPlayerId,
    directReports: workspace.directReports,
    priorAiReport: workspace.aiReport,
  });
  if (!evidenceReports.length) {
    return { error: "No supported evidence to summarize." };
  }
  const evidence: ScoutEvidence[] = evidenceReports.map((report) => ({
    id: report.id,
    matchDate: report.matchDate,
    reportBy: report.reportBy,
    isDoubles: report.isDoubles,
    opponentDisplayName: report.opponentDisplayName,
    strengthsWeaknesses: report.strengthsWeaknesses,
    scoutingReport: report.scoutingReport,
    handedness: report.handedness,
    source: report.source,
  }));
  const summary = await summarize({
    subjectLabel: `${workspace.player.displayName} (${workspace.player.teamDisplayName})`,
    kind: "player",
    evidence,
  });
  // Failed generation preserves any previous successful AI report (no write).
  if ("error" in summary) return summary;

  const client = await createSupabaseServerClient();
  const { data: existing } = await client
    .from("scouting_player_reports")
    .select("id")
    .eq("opponent_player_id", opponentPlayerId)
    .eq("kind", "ai_generated")
    .maybeSingle();

  const row = {
    opponent_player_id: opponentPlayerId,
    kind: "ai_generated",
    body: summary.body,
    quick_summary_bullets: summary.quickSummaryBullets,
    status: "draft",
    cited_direct_report_ids: summary.citedDirectReportIds,
    stale: false,
    generated_at: new Date().toISOString(),
    reviewed_at: null,
    updated_at: new Date().toISOString(),
  };

  const query = existing?.id
    ? client.from("scouting_player_reports").update(row).eq("id", existing.id).select("*").single()
    : client.from("scouting_player_reports").insert(row).select("*").single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapPlayerReport(data as PlayerReportRow);
}

export async function markPlayerAiReviewed(reportId: string): Promise<ScoutingPlayerReport> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("scouting_player_reports")
    .update({
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("kind", "ai_generated")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapPlayerReport(data as PlayerReportRow);
}

export async function regenerateTeamAiReport(
  teamId: string,
  summarize: ScoutSummarizeFn = summarizeScoutingWithOpenAi,
): Promise<ScoutingTeamReport | { error: string }> {
  const workspace = await getTeamWorkspace(teamId);
  if (!workspace.team) return { error: "Team not found." };
  const evidence: ScoutEvidence[] = workspace.directReports.map((report) => ({
    id: report.id,
    matchDate: report.matchDate,
    reportBy: report.reportBy,
    isDoubles: report.isDoubles,
    opponentDisplayName: report.opponentDisplayName,
    strengthsWeaknesses: report.strengthsWeaknesses,
    scoutingReport: report.scoutingReport,
  }));
  const summary = await summarize({
    subjectLabel: workspace.team.displayName,
    kind: "team",
    evidence,
  });
  if ("error" in summary) return summary;

  const client = await createSupabaseServerClient();
  const { data: existing } = await client
    .from("scouting_team_reports")
    .select("id")
    .eq("team_id", teamId)
    .eq("kind", "ai_generated")
    .maybeSingle();

  const row = {
    team_id: teamId,
    kind: "ai_generated",
    body: summary.body,
    status: "draft",
    cited_direct_report_ids: summary.citedDirectReportIds,
    cited_player_report_ids: [],
    stale: false,
    generated_at: new Date().toISOString(),
    reviewed_at: null,
    updated_at: new Date().toISOString(),
  };

  const query = existing?.id
    ? client.from("scouting_team_reports").update(row).eq("id", existing.id).select("*").single()
    : client.from("scouting_team_reports").insert(row).select("*").single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapTeamReport(data as TeamReportRow);
}

export async function saveManualTeamReport(
  teamId: string,
  body: string,
): Promise<ScoutingTeamReport> {
  const client = await createSupabaseServerClient();
  const { data: existing } = await client
    .from("scouting_team_reports")
    .select("id")
    .eq("team_id", teamId)
    .eq("kind", "manual")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const row = {
    team_id: teamId,
    kind: "manual",
    body,
    status: "reviewed",
    stale: false,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const query = existing?.id
    ? client.from("scouting_team_reports").update(row).eq("id", existing.id).select("*").single()
    : client.from("scouting_team_reports").insert(row).select("*").single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapTeamReport(data as TeamReportRow);
}

export async function createFormLink(input: {
  label: string;
  teamId: string | null;
  opponentPlayerId: string | null;
  expiresAt: string | null;
}): Promise<ScoutingFormLink> {
  const client = await createSupabaseServerClient();
  if (input.opponentPlayerId) {
    const { data: playerRow, error: playerError } = await client
      .from("scouting_opponent_players")
      .select("id, archived_at")
      .eq("id", input.opponentPlayerId)
      .maybeSingle();
    if (playerError) throw new Error(playerError.message);
    if (!playerRow) throw new Error("Opponent player not found.");
    if (playerRow.archived_at) {
      throw new Error("Archived opponents cannot be selected for new form links.");
    }
  }
  const { rawToken, tokenHash } = mintScoutingFormToken();
  const { data, error } = await client
    .from("scouting_form_links")
    .insert({
      token_hash: tokenHash,
      label: input.label,
      team_id: input.teamId,
      opponent_player_id: input.opponentPlayerId,
      expires_at: input.expiresAt,
    })
    .select("id, label, team_id, opponent_player_id, expires_at, revoked_at, created_at")
    .single();
  if (error) throw new Error(error.message);
  return mapFormLink(data as FormLinkRow, rawToken);
}

export async function revokeFormLink(id: string): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client
    .from("scouting_form_links")
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Archive opponent player (lifecycle only — no deletes/unlinks).
 * Deactivates opponent-scoped form links; preserves link rows and submissions.
 * Idempotent when already archived.
 */
export async function archiveOpponentPlayer(
  opponentPlayerId: string,
  actorUserId: string | null,
): Promise<{
  player: ScoutingOpponentPlayer;
  deactivatedFormLinkCount: number;
  alreadyArchived: boolean;
}> {
  const client = await createSupabaseServerClient();
  const workspace = await getPlayerWorkspace(opponentPlayerId);
  if (!workspace.player) throw new Error("Opponent player not found.");

  const alreadyArchived = Boolean(workspace.player.archivedAt);
  const now = new Date().toISOString();

  if (!alreadyArchived) {
    const { error } = await client
      .from("scouting_opponent_players")
      .update({
        archived_at: now,
        archived_by: actorUserId,
        updated_at: now,
      })
      .eq("id", opponentPlayerId);
    if (error) throw new Error(error.message);
  }

  const { data: revokedRows, error: revokeError } = await client
    .from("scouting_form_links")
    .update({ revoked_at: now, updated_at: now })
    .eq("opponent_player_id", opponentPlayerId)
    .is("revoked_at", null)
    .select("id");
  if (revokeError) throw new Error(revokeError.message);

  const refreshed = await getPlayerWorkspace(opponentPlayerId);
  if (!refreshed.player) throw new Error("Opponent player not found after archive.");

  return {
    player: refreshed.player,
    deactivatedFormLinkCount: revokedRows?.length ?? 0,
    alreadyArchived,
  };
}

/**
 * Restore archived opponent to active. Does not reactivate form links.
 * Idempotent when already active.
 */
export async function restoreOpponentPlayer(opponentPlayerId: string): Promise<{
  player: ScoutingOpponentPlayer;
  alreadyActive: boolean;
}> {
  const client = await createSupabaseServerClient();
  const workspace = await getPlayerWorkspace(opponentPlayerId);
  if (!workspace.player) throw new Error("Opponent player not found.");

  const alreadyActive = !workspace.player.archivedAt;
  if (!alreadyActive) {
    const now = new Date().toISOString();
    const { error } = await client
      .from("scouting_opponent_players")
      .update({
        archived_at: null,
        archived_by: null,
        updated_at: now,
      })
      .eq("id", opponentPlayerId);
    if (error) throw new Error(error.message);
  }

  const refreshed = await getPlayerWorkspace(opponentPlayerId);
  if (!refreshed.player) throw new Error("Opponent player not found after restore.");

  return {
    player: refreshed.player,
    alreadyActive,
  };
}

export async function updateSubmissionStatus(
  id: string,
  status: FormSubmissionStatus,
): Promise<ScoutingFormSubmission> {
  if (status === "published" || status === "reviewed") {
    throw new Error(
      "Use Review & Publish to resolve the submission into a Match Report. Status alone cannot mark it published.",
    );
  }
  if (status === "needs_clarification") {
    status = "needs_review";
  }
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("scouting_form_submissions")
    .update({
      status,
      reviewed_at: status === "new" || status === "needs_review" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapFormSubmission(data as FormSubmissionRow);
}

export async function promoteFormSubmission(submissionId: string): Promise<{
  directReportId: string | null;
  submissionStatus: string;
  outcome: string;
}> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("scouting_promote_form_submission", {
    p_submission_id: submissionId,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    directReportId: (row?.direct_report_id as string | null) ?? null,
    submissionStatus: String(row?.submission_status ?? "needs_review"),
    outcome: String(row?.outcome ?? "promoted"),
  };
}

export async function backfillUnpromotedSubmissions(): Promise<{
  inspected: number;
  published: number;
  needsReview: number;
  alreadyPromoted: number;
  failures: number;
}> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("scouting_backfill_unpromoted_submissions");
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    inspected: Number(row?.inspected ?? 0),
    published: Number(row?.published ?? 0),
    needsReview: Number(row?.needs_review ?? 0),
    alreadyPromoted: Number(row?.already_promoted ?? 0),
    failures: Number(row?.failures ?? 0),
  };
}

export async function reviewAndPublishFormSubmission(input: {
  submissionId: string;
  teamId: string;
  opponentPlayerId: string | null;
  createPlayer: boolean;
  playerDisplayName?: string | null;
}): Promise<{ directReportId: string; submissionStatus: string }> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("scouting_review_form_submission", {
    p_submission_id: input.submissionId,
    p_team_id: input.teamId,
    p_opponent_player_id: input.opponentPlayerId,
    p_create_player: input.createPlayer,
    p_player_display_name: input.playerDisplayName ?? null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.direct_report_id) throw new Error("Review did not produce a direct report.");
  return {
    directReportId: row.direct_report_id as string,
    submissionStatus: String(row.submission_status ?? "published"),
  };
}

export async function mapScoutingTeamAlias(
  teamId: string,
  displayAlias: string,
): Promise<string> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("scouting_map_team_alias", {
    p_team_id: teamId,
    p_display_alias: displayAlias,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function listScoutingTeamAliases(): Promise<
  Array<{ id: string; teamId: string; normalizedAlias: string; displayAlias: string }>
> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("scouting_team_aliases")
    .select("id, team_id, normalized_alias, display_alias")
    .order("normalized_alias");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data as Array<{
    id: string;
    team_id: string;
    normalized_alias: string;
    display_alias: string;
  }> | null) ?? []).map((row) => ({
    id: row.id,
    teamId: row.team_id,
    normalizedAlias: row.normalized_alias,
    displayAlias: row.display_alias,
  }));
}

export async function runScoutingDuplicateAuditCounts() {
  const { buildScoutingDuplicateAuditCounts } = await import("./duplicateAudit");
  const client = await createSupabaseServerClient();
  const [teams, players, reports, links, aliases, submissions] = await Promise.all([
    client.from("scouting_teams").select("id, display_name, identity_slug"),
    client.from("scouting_opponent_players").select("id, team_id, display_name, normalized_name"),
    client.from("scouting_direct_reports").select("id, team_id, opponent_player_id"),
    client.from("scouting_form_links").select("id, team_id, opponent_player_id"),
    client.from("scouting_team_aliases").select("team_id, normalized_alias, display_alias"),
    client.from("scouting_form_submissions").select("team_display_name"),
  ]);
  if (teams.error) throw new Error(teams.error.message);
  return buildScoutingDuplicateAuditCounts({
    teams: (teams.data ?? []).map((row) => ({
      id: row.id as string,
      displayName: row.display_name as string,
      identitySlug: (row.identity_slug as string | null) ?? null,
    })),
    players: (players.data ?? []).map((row) => ({
      id: row.id as string,
      teamId: row.team_id as string,
      displayName: row.display_name as string,
      normalizedName: row.normalized_name as string,
    })),
    directReports: (reports.data ?? []).map((row) => ({
      id: row.id as string,
      teamId: row.team_id as string,
      opponentPlayerId: (row.opponent_player_id as string | null) ?? null,
    })),
    formLinks: (links.data ?? []).map((row) => ({
      id: row.id as string,
      teamId: (row.team_id as string | null) ?? null,
      opponentPlayerId: (row.opponent_player_id as string | null) ?? null,
    })),
    aliases: (aliases.data ?? []).map((row) => ({
      teamId: row.team_id as string,
      normalizedAlias: row.normalized_alias as string,
      displayAlias: row.display_alias as string,
    })),
    submissionTeamLabels: (submissions.data ?? []).map(
      (row) => (row.team_display_name as string) ?? "",
    ),
  });
}

export async function resolvePublicFormLink(rawToken: string) {
  const client = createAnonClient();
  const tokenHash = hashScoutingFormToken(rawToken);
  const { data, error } = await client.rpc("scouting_resolve_form_link", {
    p_token_hash: tokenHash,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    linkId: row.link_id as string,
    label: (row.label as string) ?? "",
    teamDisplayName: (row.team_display_name as string) ?? "",
    playerDisplayName: (row.player_display_name as string) ?? "",
    expiresAt: (row.expires_at as string) ?? null,
    revoked: Boolean(row.revoked),
  };
}

export async function submitPublicForm(
  rawToken: string,
  payload: {
    opponentDisplayName: string;
    teamDisplayName: string;
    matchDate: string | null;
    handedness: string | null;
    strengthsWeaknesses: string | null;
    scoutingReport: string | null;
    reportBy: string | null;
    isDoubles: boolean;
  },
  clientFingerprint?: string,
): Promise<{ id: string } | { error: string }> {
  const client = createAnonClient();
  const tokenHash = hashScoutingFormToken(rawToken);
  const { data, error } = await client.rpc("scouting_submit_form_response", {
    p_token_hash: tokenHash,
    p_opponent_display_name: payload.opponentDisplayName,
    p_team_display_name: payload.teamDisplayName,
    p_match_date: payload.matchDate,
    p_handedness: payload.handedness,
    p_strengths_weaknesses: payload.strengthsWeaknesses,
    p_scouting_report: payload.scoutingReport,
    p_report_by: payload.reportBy,
    p_is_doubles: payload.isDoubles,
    p_client_fingerprint: clientFingerprint ?? null,
  });
  if (error) {
    const message = error.message || "Submit failed.";
    if (/invalid_token/i.test(message)) return { error: "This form link is invalid." };
    if (/revoked_token/i.test(message)) return { error: "This form link has been revoked." };
    if (/expired_token/i.test(message)) return { error: "This form link has expired." };
    if (/rate_limited/i.test(message)) return { error: "Too many submissions. Try again in a minute." };
    if (/empty_submission/i.test(message)) return { error: "Add an opponent name or notes before submitting." };
    return { error: message };
  }
  return { id: String(data) };
}
