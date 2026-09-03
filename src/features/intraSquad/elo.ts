import { EMPTY_VALUE } from "@/lib/formatting";

import { playerResultsFromMatch, playerNameFor } from "./records";
import { eloScoreForOutcome } from "./resultModel";
import type {
  IntraSquadMatch,
  IntraSquadWeight,
  PlayerMatchOutcome,
  PlayerRecord,
  RosterPlayer,
} from "./types";

export const ELO_STARTING_RATING = 1500;

export const ELO_K_BY_WEIGHT: Record<IntraSquadWeight, number> = {
  1: 24,
  2: 36,
  3: 48,
};

export type EloHistoryEvent = {
  playerId: string;
  matchId: string;
  playedAt: string;
  createdAt: string;
  opponentId: string;
  ratingBefore: number;
  expectedResult: number;
  actualResult: number;
  kFactor: number;
  ratingChange: number;
  ratingAfter: number;
  outcome: PlayerMatchOutcome;
  weight: IntraSquadWeight;
  status: IntraSquadMatch["status"];
};

export type EloPlayerStanding = {
  playerId: string;
  rating: number;
  matchesPlayed: number;
  changeFromStart: number;
  lastMatchAt: string | null;
  history: EloHistoryEvent[];
};

export type EloRebuildResult = {
  ratings: Map<string, number>;
  standings: Map<string, EloPlayerStanding>;
  events: EloHistoryEvent[];
};

export type EloRankingRow = {
  rank: number;
  playerId: string;
  rating: number;
  changeFromStart: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  unfinishedLeading: number;
  unfinishedTrailing: number;
  lastMatchAt: string | null;
  history: EloHistoryEvent[];
};

export function kFactorForWeight(weight: IntraSquadWeight): number {
  return ELO_K_BY_WEIGHT[weight];
}

/** Standard Elo expected score for the player vs opponent. */
export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function ratingDelta(
  playerRating: number,
  opponentRating: number,
  actualResult: number,
  kFactor: number,
): { expected: number; change: number; next: number } {
  const expected = expectedScore(playerRating, opponentRating);
  const change = kFactor * (actualResult - expected);
  return { expected, change, next: playerRating + change };
}

export function sortMatchesChronologically(
  matches: readonly IntraSquadMatch[],
): IntraSquadMatch[] {
  return [...matches].sort((a, b) => {
    if (a.playedAt !== b.playedAt) return a.playedAt.localeCompare(b.playedAt);
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.id.localeCompare(b.id);
  });
}

function emptyStanding(playerId: string): EloPlayerStanding {
  return {
    playerId,
    rating: ELO_STARTING_RATING,
    matchesPlayed: 0,
    changeFromStart: 0,
    lastMatchAt: null,
    history: [],
  };
}

/**
 * Rebuild all Elo ratings and history from canonical match rows.
 * Deterministic: played_at ASC → created_at ASC → id ASC.
 */
export function rebuildEloFromMatches(matches: readonly IntraSquadMatch[]): EloRebuildResult {
  const chronological = sortMatchesChronologically(matches);
  const ratings = new Map<string, number>();
  const histories = new Map<string, EloHistoryEvent[]>();
  const events: EloHistoryEvent[] = [];

  function ratingOf(playerId: string): number {
    const existing = ratings.get(playerId);
    if (existing !== undefined) return existing;
    ratings.set(playerId, ELO_STARTING_RATING);
    return ELO_STARTING_RATING;
  }

  function pushEvent(event: EloHistoryEvent) {
    events.push(event);
    const list = histories.get(event.playerId) ?? [];
    list.push(event);
    histories.set(event.playerId, list);
  }

  for (const match of chronological) {
    const [primary, opponent] = playerResultsFromMatch(match);
    if (!primary.playerId || !opponent.playerId) continue;

    const beforeA = ratingOf(primary.playerId);
    const beforeB = ratingOf(opponent.playerId);
    const k = kFactorForWeight(match.weight);
    const actualA = eloScoreForOutcome(primary.outcome);
    const actualB = eloScoreForOutcome(opponent.outcome);

    const nextA = ratingDelta(beforeA, beforeB, actualA, k);
    const nextB = ratingDelta(beforeB, beforeA, actualB, k);

    ratings.set(primary.playerId, nextA.next);
    ratings.set(opponent.playerId, nextB.next);

    pushEvent({
      playerId: primary.playerId,
      matchId: match.id,
      playedAt: match.playedAt,
      createdAt: match.createdAt,
      opponentId: opponent.playerId,
      ratingBefore: beforeA,
      expectedResult: nextA.expected,
      actualResult: actualA,
      kFactor: k,
      ratingChange: nextA.change,
      ratingAfter: nextA.next,
      outcome: primary.outcome,
      weight: match.weight,
      status: match.status,
    });

    pushEvent({
      playerId: opponent.playerId,
      matchId: match.id,
      playedAt: match.playedAt,
      createdAt: match.createdAt,
      opponentId: primary.playerId,
      ratingBefore: beforeB,
      expectedResult: nextB.expected,
      actualResult: actualB,
      kFactor: k,
      ratingChange: nextB.change,
      ratingAfter: nextB.next,
      outcome: opponent.outcome,
      weight: match.weight,
      status: match.status,
    });
  }

  const standings = new Map<string, EloPlayerStanding>();
  for (const [playerId, rating] of ratings) {
    const history = histories.get(playerId) ?? [];
    standings.set(playerId, {
      playerId,
      rating,
      matchesPlayed: history.length,
      changeFromStart: rating - ELO_STARTING_RATING,
      lastMatchAt: history.length > 0 ? history[history.length - 1]!.playedAt : null,
      history,
    });
  }

  return { ratings, standings, events };
}

export function compareEloRankings(
  a: Pick<EloRankingRow, "rating" | "matchesPlayed" | "playerId">,
  b: Pick<EloRankingRow, "rating" | "matchesPlayed" | "playerId">,
  roster: readonly RosterPlayer[],
): number {
  if (b.rating !== a.rating) return b.rating - a.rating;
  const aHas = a.matchesPlayed > 0 ? 1 : 0;
  const bHas = b.matchesPlayed > 0 ? 1 : 0;
  if (bHas !== aHas) return bHas - aHas;
  return playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster));
}

export function computeEloRankings(
  matches: readonly IntraSquadMatch[],
  records: readonly PlayerRecord[],
  roster: readonly RosterPlayer[],
): EloRankingRow[] {
  const rebuild = rebuildEloFromMatches(matches);
  const recordById = new Map(records.map((row) => [row.playerId, row]));

  const rows: EloRankingRow[] = roster.map((player) => {
    const standing = rebuild.standings.get(player.id) ?? emptyStanding(player.id);
    const record = recordById.get(player.id);
    return {
      rank: 0,
      playerId: player.id,
      rating: standing.rating,
      changeFromStart: standing.changeFromStart,
      matchesPlayed: standing.matchesPlayed,
      wins: record?.wins ?? 0,
      losses: record?.losses ?? 0,
      unfinishedLeading: record?.unfinishedLeading ?? 0,
      unfinishedTrailing: record?.unfinishedTrailing ?? 0,
      lastMatchAt: standing.lastMatchAt,
      history: standing.history,
    };
  });

  rows.sort((a, b) => compareEloRankings(a, b, roster));
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function eloRatingForPlayer(
  rebuild: EloRebuildResult,
  playerId: string,
): number {
  return rebuild.ratings.get(playerId) ?? ELO_STARTING_RATING;
}

export function formatEloRating(rating: number): string {
  return String(Math.round(rating));
}

export function formatEloChangeFromStart(change: number, matchesPlayed: number): string {
  if (matchesPlayed <= 0) return EMPTY_VALUE;
  const rounded = Math.round(change);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return String(rounded);
  return "0";
}

export function formatEloHistoryChange(change: number): string {
  const rounded = Math.round(change);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return String(rounded);
  return "0";
}

export function formatEloResultLabel(outcome: PlayerMatchOutcome): string {
  switch (outcome) {
    case "W":
      return "Win";
    case "L":
      return "Loss";
    case "leading":
      return "UF Lead";
    case "trailing":
      return "UF Trail";
  }
}

export function topEloPlayers(
  rankings: readonly EloRankingRow[],
  limit = 5,
): EloRankingRow[] {
  return rankings.filter((row) => row.matchesPlayed > 0).slice(0, limit);
}
