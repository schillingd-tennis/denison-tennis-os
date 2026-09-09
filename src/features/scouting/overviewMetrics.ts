/**
 * Opponent Player Card Overview — summary cards + Quick AI evidence selection.
 * Pure helpers; no AI calls.
 */

import { EMPTY_VALUE, formatDate } from "@/lib/formatting";
import { isCompoundOpponentName } from "./csvImport";
import type { ScoutingDirectReport, ScoutingPlayerReport, ScoutingTeamReport } from "./types";

export type OverviewAuthorInput = {
  reportBy: string;
  reportAuthorUserId?: string | null;
};

/** Linked direct reports for one opponent player; deduped by id then source_key. */
export function linkedDirectReportsForPlayer(
  reports: ScoutingDirectReport[],
  playerId: string,
): ScoutingDirectReport[] {
  const linked = reports.filter((report) => report.opponentPlayerId === playerId);
  return dedupeDirectReports(linked);
}

export function dedupeDirectReports(reports: ScoutingDirectReport[]): ScoutingDirectReport[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const out: ScoutingDirectReport[] = [];
  for (const report of reports) {
    if (seenIds.has(report.id)) continue;
    if (report.sourceKey && seenKeys.has(report.sourceKey)) continue;
    seenIds.add(report.id);
    if (report.sourceKey) seenKeys.add(report.sourceKey);
    out.push(report);
  }
  return out;
}

export function countLinkedDirectReports(
  reports: ScoutingDirectReport[],
  playerId: string,
): number {
  return linkedDirectReportsForPlayer(reports, playerId).length;
}

/** Max valid ISO match_date among linked directs; undated never outrank. */
export function latestLinkedReportDate(
  reports: ScoutingDirectReport[],
  playerId: string,
): string | null {
  let latest: string | null = null;
  for (const report of linkedDirectReportsForPlayer(reports, playerId)) {
    const date = report.matchDate?.trim() || null;
    if (!date) continue;
    if (latest == null || date > latest) latest = date;
  }
  return latest;
}

export function latestLinkedReportDateLabel(
  reports: ScoutingDirectReport[],
  playerId: string,
): string {
  const date = latestLinkedReportDate(reports, playerId);
  return date ? formatDate(date) : EMPTY_VALUE;
}

export function normalizeContributorNameKey(reportBy: string): string | null {
  const trimmed = reportBy.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

export function contributorIdentityKey(input: OverviewAuthorInput): string | null {
  const userId = input.reportAuthorUserId?.trim();
  if (userId) return `user:${userId}`;
  const nameKey = normalizeContributorNameKey(input.reportBy);
  if (!nameKey) return null;
  return `name:${nameKey}`;
}

export function countDistinctContributors(
  reports: ScoutingDirectReport[],
  playerId: string,
): number {
  const keys = new Set<string>();
  for (const report of linkedDirectReportsForPlayer(reports, playerId)) {
    const key = contributorIdentityKey({
      reportBy: report.reportBy,
      reportAuthorUserId: report.reportAuthorUserId,
    });
    if (key) keys.add(key);
  }
  return keys.size;
}

/**
 * Direct reports eligible as AI evidence for a player.
 * Excludes other players, compounds, team-level, and prior AI bodies.
 */
export function selectPlayerAiEvidenceReports(input: {
  playerId: string;
  directReports: ScoutingDirectReport[];
  /** Ignored as evidence — present only so callers cannot pass AI as sources by mistake. */
  priorAiReport?: ScoutingPlayerReport | null;
  teamReports?: ScoutingTeamReport[];
}): ScoutingDirectReport[] {
  void input.priorAiReport;
  void input.teamReports;
  const linked = linkedDirectReportsForPlayer(input.directReports, input.playerId);
  return linked.filter((report) => {
    if (report.importStatus === "team_level") return false;
    if (report.importStatus === "compound_unresolved") return false;
    if (isCompoundOpponentName(report.opponentDisplayName)) return false;
    return true;
  });
}

export function quickAiSourceSubtitle(reportCount: number, contributorCount: number): string {
  if (reportCount <= 0) return "No scouting reports are linked to this opponent yet.";
  if (reportCount === 1) return "Based on 1 report";
  const contrib =
    contributorCount === 1
      ? "1 contributor"
      : `${contributorCount} contributors`;
  return `Generated from ${reportCount} reports by ${contrib}`;
}

/** Player IDs whose AI summary should be marked stale after a direct-report change. */
export function playerIdsToMarkAiStale(
  previousOpponentPlayerId: string | null | undefined,
  nextOpponentPlayerId: string | null | undefined,
): string[] {
  const ids = new Set<string>();
  if (previousOpponentPlayerId) ids.add(previousOpponentPlayerId);
  if (nextOpponentPlayerId) ids.add(nextOpponentPlayerId);
  return [...ids];
}
