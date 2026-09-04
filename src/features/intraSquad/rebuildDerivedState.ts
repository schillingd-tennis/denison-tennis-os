import {
  intraSquadDashboardStats,
  sortMatchesNewestFirst,
} from "./display";
import {
  computeEloRankings,
  rebuildEloFromMatches,
  type EloRankingRow,
  type EloRebuildResult,
} from "./elo";
import {
  computeMatchValueRankings,
  computeMatchValueStandings,
  type MatchValuePlayerStanding,
  type MatchValueRankingRow,
} from "./matchValue";
import { computeProvisionalRankings, topProvisionalRankings } from "./rankings";
import { computePlayerRecords } from "./records";
import type {
  IntraSquadMatch,
  PlayerRecord,
  ProvisionalRankingRow,
  RosterPlayer,
} from "./types";

/**
 * Canonical match fields whose change requires a full derived-state rebuild.
 * Any edit that mutates these (or player identity on either side) must replace
 * the match row and re-derive everything from history — never delta-patch.
 */
export const INTRA_SQUAD_REBUILD_TRIGGER_FIELDS = [
  "playedAt",
  "status",
  "winnerPlayerId",
  "loserPlayerId",
  "leaderPlayerId",
  "trailingPlayerId",
  "scoreText",
  "scoreSets",
  "weight",
] as const satisfies ReadonlyArray<keyof IntraSquadMatch>;

export type IntraSquadDashboardDerivedStats = ReturnType<typeof intraSquadDashboardStats>;

export type IntraSquadDerivedState = {
  /** Newest-first display order (Match Log / Recent Matches). */
  orderedMatches: IntraSquadMatch[];
  records: PlayerRecord[];
  rankings: ProvisionalRankingRow[];
  top5: ProvisionalRankingRow[];
  elo: EloRebuildResult;
  eloRankings: EloRankingRow[];
  matchValueStandings: Map<string, MatchValuePlayerStanding>;
  matchValueByPlayerId: Map<string, number>;
  matchValueRankings: MatchValueRankingRow[];
  dashboard: IntraSquadDashboardDerivedStats;
};

/**
 * Single source of derived Intra Squad metrics.
 * All views (dashboard, rankings, records, Match Value, Elo, player detail)
 * should consume this result after any canonical match create/edit/delete.
 */
export function rebuildIntraSquadDerivedState(
  matches: readonly IntraSquadMatch[],
  roster: readonly RosterPlayer[],
): IntraSquadDerivedState {
  const orderedMatches = sortMatchesNewestFirst(matches);
  const records = computePlayerRecords(orderedMatches);
  const rankings = computeProvisionalRankings(orderedMatches, records, roster);
  const top5 = topProvisionalRankings(orderedMatches, records, roster, 5);
  const elo = rebuildEloFromMatches(matches);
  const eloRankings = computeEloRankings(matches, records, roster);
  const matchValueStandings = computeMatchValueStandings(matches);
  const matchValueByPlayerId = new Map<string, number>();
  for (const [playerId, standing] of matchValueStandings) {
    matchValueByPlayerId.set(playerId, standing.totalMatchValue);
  }
  const matchValueRankings = computeMatchValueRankings(matches, roster);
  const dashboard = intraSquadDashboardStats(orderedMatches);

  return {
    orderedMatches,
    records,
    rankings,
    top5,
    elo,
    eloRankings,
    matchValueStandings,
    matchValueByPlayerId,
    matchValueRankings,
    dashboard,
  };
}

/**
 * Apply a saved canonical match into history, then rebuild all derived metrics.
 * Used by edit/create save flows and regression tests — never patches metrics in place.
 */
export function applyCanonicalMatchAndRebuild(
  matches: readonly IntraSquadMatch[],
  saved: IntraSquadMatch,
  roster: readonly RosterPlayer[],
): { matches: IntraSquadMatch[]; derived: IntraSquadDerivedState } {
  const exists = matches.some((row) => row.id === saved.id);
  const next = exists
    ? matches.map((row) => (row.id === saved.id ? saved : row))
    : [saved, ...matches];
  return { matches: next, derived: rebuildIntraSquadDerivedState(next, roster) };
}

/**
 * Remove a canonical match, then rebuild all derived metrics.
 */
export function removeCanonicalMatchAndRebuild(
  matches: readonly IntraSquadMatch[],
  matchId: string,
  roster: readonly RosterPlayer[],
): { matches: IntraSquadMatch[]; derived: IntraSquadDerivedState } {
  const next = matches.filter((row) => row.id !== matchId);
  return { matches: next, derived: rebuildIntraSquadDerivedState(next, roster) };
}
