import { EMPTY_VALUE } from "@/lib/formatting";

import { eloRatingForPlayer, rebuildEloFromMatches } from "./elo";
import { isCompletedTennisSet } from "./matchState";
import { isUnfinishedMatch, opponentPlayerId, primaryPlayerId } from "./matchPlayers";
import { playerNameFor } from "./records";
import type {
  IntraSquadMatch,
  IntraSquadWeight,
  PlayerMatchOutcome,
  RosterPlayer,
  ScoreSet,
} from "./types";

/**
 * Match Value constants.
 *
 * Completed:
 *   full match ±1.00 · one-set ±0.60 · then × Weight
 *
 * Unfinished (leader score perspective):
 *   setComponent = setAdvantage × COMPLETED_SET_VALUE
 *   currentComponent = clamp(gameDiff / SCALE, ±1) × CURRENT_SET_MAX_VALUE
 *   base = clamp(set + current, ±UNFINISHED_MAX_VALUE)
 *
 * Completed sets are the primary signal — a 1–0 set lead cannot be erased by
 * trailing in the current set. Current-set games only trim/add within ±0.20.
 *
 * Targets (Weight 1):
 *   6-4, 3-2   ≈ +0.50
 *   6-1, 5-1   ≈ +0.65
 *   6-1, 1-5   ≈ +0.25  (Arya still positive after winning set 1)
 *   1-1, 4-2   ≈ +0.10
 *   3-3        ≈ 0
 */
export const MATCH_VALUE_FULL_BASE = 1;
export const MATCH_VALUE_ONE_SET_BASE = 0.6;
export const COMPLETED_SET_VALUE = 0.45;
export const CURRENT_SET_MAX_VALUE = 0.2;
export const CURRENT_SET_SCALE_GAMES = 4;
export const UNFINISHED_MAX_VALUE = 0.9;

/** @deprecated use COMPLETED_SET_VALUE — kept for older test imports */
export const MATCH_VALUE_UNFINISHED_SET_FACTOR = COMPLETED_SET_VALUE;
/** @deprecated use CURRENT_SET_MAX_VALUE / SCALE */
export const MATCH_VALUE_UNFINISHED_GAME_FACTOR = CURRENT_SET_MAX_VALUE / CURRENT_SET_SCALE_GAMES;
export const MATCH_VALUE_UNFINISHED_CLAMP = UNFINISHED_MAX_VALUE;

/** Reserved for a future score-dominance adjustment. V1 always 1.0. */
export const MATCH_VALUE_DOMINANCE_MODIFIER = 1;

export type MatchCompleteness = "full_completed" | "one_set_completed" | "unfinished";

export type SetGameTotals = {
  setsWon: number;
  setsLost: number;
  setDiff: number;
  gamesWon: number;
  gamesLost: number;
  gameDiff: number;
};

export type MatchValueSide = {
  playerId: string;
  opponentId: string;
  outcome: PlayerMatchOutcome;
  completeness: MatchCompleteness;
  baseValue: number;
  matchValue: number;
  weight: IntraSquadWeight;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
};

export type MatchValuePair = {
  matchId: string;
  playedAt: string;
  scoreText: string;
  weight: IntraSquadWeight;
  completeness: MatchCompleteness;
  primary: MatchValueSide;
  opponent: MatchValueSide;
};

export type MatchValueHistoryEvent = MatchValueSide & {
  matchId: string;
  playedAt: string;
  scoreText: string;
};

export type MatchValuePlayerStanding = {
  playerId: string;
  totalMatchValue: number;
  matchesPlayed: number;
  fullWins: number;
  fullLosses: number;
  oneSetWins: number;
  oneSetLosses: number;
  unfinishedLeading: number;
  unfinishedTrailing: number;
  setsWon: number;
  setsLost: number;
  setDiff: number;
  gamesWon: number;
  gamesLost: number;
  gameDiff: number;
  averageWeight: number | null;
  history: MatchValueHistoryEvent[];
};

export type MatchValueRankingRow = MatchValuePlayerStanding & {
  rank: number;
  elo: number;
};

export function classifyMatchCompleteness(match: IntraSquadMatch): MatchCompleteness {
  if (isUnfinishedMatch(match)) return "unfinished";
  return match.scoreSets.length <= 1 ? "one_set_completed" : "full_completed";
}

export function formatMatchCompletenessLabel(kind: MatchCompleteness): string {
  switch (kind) {
    case "full_completed":
      return "Full";
    case "one_set_completed":
      return "1 Set";
    case "unfinished":
      return "Unfinished";
  }
}

/**
 * Sets/games from a player's perspective.
 * Stored score sets use first number = primary (winner/leader) games.
 * Pass invert=true for the opponent.
 */
export function setGameTotalsFromPerspective(
  sets: readonly ScoreSet[],
  invert = false,
): SetGameTotals {
  let setsWon = 0;
  let setsLost = 0;
  let gamesWon = 0;
  let gamesLost = 0;

  for (const set of sets) {
    const a = invert ? set.loserGames : set.winnerGames;
    const b = invert ? set.winnerGames : set.loserGames;
    gamesWon += a;
    gamesLost += b;
    if (isCompletedTennisSet(set)) {
      if (a > b) setsWon += 1;
      else if (b > a) setsLost += 1;
    }
  }

  return {
    setsWon,
    setsLost,
    setDiff: setsWon - setsLost,
    gamesWon,
    gamesLost,
    gameDiff: gamesWon - gamesLost,
  };
}

/**
 * Unfinished result value from the LEADER's score perspective
 * (first number in each set = leader games).
 */
export function unfinishedResultValueFromLeaderScore(sets: readonly ScoreSet[]): number {
  let leaderSets = 0;
  let trailerSets = 0;
  let currentSet: ScoreSet | null = null;

  for (const set of sets) {
    if (isCompletedTennisSet(set)) {
      if (set.winnerGames > set.loserGames) leaderSets += 1;
      else if (set.loserGames > set.winnerGames) trailerSets += 1;
    } else {
      currentSet = set;
    }
  }

  const setAdvantage = leaderSets - trailerSets;
  const gameAdvantage = currentSet ? currentSet.winnerGames - currentSet.loserGames : 0;
  const setComponent = setAdvantage * COMPLETED_SET_VALUE;
  const currentScaled = clamp(gameAdvantage / CURRENT_SET_SCALE_GAMES, -1, 1);
  const currentComponent = currentScaled * CURRENT_SET_MAX_VALUE;
  return clamp(setComponent + currentComponent, -UNFINISHED_MAX_VALUE, UNFINISHED_MAX_VALUE);
}

export function completedBaseResultValue(completeness: Exclude<MatchCompleteness, "unfinished">): number {
  return completeness === "one_set_completed" ? MATCH_VALUE_ONE_SET_BASE : MATCH_VALUE_FULL_BASE;
}

/**
 * MatchValue = CompletionValue × DominanceModifier × Weight
 * DominanceModifier is 1.0 in V1 (future-ready hook).
 */
export function applyMatchValueModifiers(baseValue: number, weight: IntraSquadWeight): number {
  const raw = baseValue * MATCH_VALUE_DOMINANCE_MODIFIER * weight;
  return Math.round(raw * 1e10) / 1e10;
}

export function matchValueForMatch(match: IntraSquadMatch): MatchValuePair {
  const completeness = classifyMatchCompleteness(match);
  const primaryId = primaryPlayerId(match);
  const opponentId = opponentPlayerId(match);
  const weight = match.weight;
  const primarySetsGames = setGameTotalsFromPerspective(match.scoreSets, false);
  const opponentSetsGames = setGameTotalsFromPerspective(match.scoreSets, true);

  let primaryBase: number;
  let primaryOutcome: PlayerMatchOutcome;
  let opponentOutcome: PlayerMatchOutcome;

  if (completeness === "unfinished") {
    primaryBase = unfinishedResultValueFromLeaderScore(match.scoreSets);
    primaryOutcome = "leading";
    opponentOutcome = "trailing";
  } else {
    primaryBase = completedBaseResultValue(completeness);
    primaryOutcome = "W";
    opponentOutcome = "L";
  }

  const primaryValue = applyMatchValueModifiers(primaryBase, weight);
  const opponentValue = -primaryValue;
  const opponentBase = -primaryBase;

  return {
    matchId: match.id,
    playedAt: match.playedAt,
    scoreText: match.scoreText,
    weight,
    completeness,
    primary: {
      playerId: primaryId,
      opponentId,
      outcome: primaryOutcome,
      completeness,
      baseValue: primaryBase,
      matchValue: primaryValue,
      weight,
      setsWon: primarySetsGames.setsWon,
      setsLost: primarySetsGames.setsLost,
      gamesWon: primarySetsGames.gamesWon,
      gamesLost: primarySetsGames.gamesLost,
    },
    opponent: {
      playerId: opponentId,
      opponentId: primaryId,
      outcome: opponentOutcome,
      completeness,
      baseValue: opponentBase,
      matchValue: opponentValue,
      weight,
      setsWon: opponentSetsGames.setsWon,
      setsLost: opponentSetsGames.setsLost,
      gamesWon: opponentSetsGames.gamesWon,
      gamesLost: opponentSetsGames.gamesLost,
    },
  };
}

function emptyStanding(playerId: string): MatchValuePlayerStanding {
  return {
    playerId,
    totalMatchValue: 0,
    matchesPlayed: 0,
    fullWins: 0,
    fullLosses: 0,
    oneSetWins: 0,
    oneSetLosses: 0,
    unfinishedLeading: 0,
    unfinishedTrailing: 0,
    setsWon: 0,
    setsLost: 0,
    setDiff: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameDiff: 0,
    averageWeight: null,
    history: [],
  };
}

export function computeMatchValueStandings(
  matches: readonly IntraSquadMatch[],
): Map<string, MatchValuePlayerStanding> {
  const byId = new Map<string, MatchValuePlayerStanding>();

  function ensure(playerId: string): MatchValuePlayerStanding {
    const existing = byId.get(playerId);
    if (existing) return existing;
    const created = emptyStanding(playerId);
    byId.set(playerId, created);
    return created;
  }

  const chronological = [...matches].sort((a, b) => {
    if (a.playedAt !== b.playedAt) return a.playedAt.localeCompare(b.playedAt);
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.id.localeCompare(b.id);
  });

  for (const match of chronological) {
    if (!primaryPlayerId(match) || !opponentPlayerId(match)) continue;
    const pair = matchValueForMatch(match);
    for (const side of [pair.primary, pair.opponent]) {
      if (!side.playerId) continue;
      const standing = ensure(side.playerId);
      standing.totalMatchValue += side.matchValue;
      standing.matchesPlayed += 1;
      standing.setsWon += side.setsWon;
      standing.setsLost += side.setsLost;
      standing.gamesWon += side.gamesWon;
      standing.gamesLost += side.gamesLost;
      standing.history.push({
        ...side,
        matchId: pair.matchId,
        playedAt: pair.playedAt,
        scoreText: pair.scoreText,
      });

      if (pair.completeness === "full_completed") {
        if (side.outcome === "W") standing.fullWins += 1;
        else standing.fullLosses += 1;
      } else if (pair.completeness === "one_set_completed") {
        if (side.outcome === "W") standing.oneSetWins += 1;
        else standing.oneSetLosses += 1;
      } else if (side.outcome === "leading") {
        standing.unfinishedLeading += 1;
      } else {
        standing.unfinishedTrailing += 1;
      }
    }
  }

  for (const standing of byId.values()) {
    standing.setDiff = standing.setsWon - standing.setsLost;
    standing.gameDiff = standing.gamesWon - standing.gamesLost;
    if (standing.matchesPlayed === 0) {
      standing.averageWeight = null;
      continue;
    }
    const weightSum = standing.history.reduce((sum, row) => sum + row.weight, 0);
    standing.averageWeight = weightSum / standing.matchesPlayed;
  }

  return byId;
}

export function compareMatchValueRankings(
  a: Pick<MatchValueRankingRow, "totalMatchValue" | "elo" | "fullWins" | "playerId">,
  b: Pick<MatchValueRankingRow, "totalMatchValue" | "elo" | "fullWins" | "playerId">,
  roster: readonly RosterPlayer[],
): number {
  if (b.totalMatchValue !== a.totalMatchValue) return b.totalMatchValue - a.totalMatchValue;
  if (b.elo !== a.elo) return b.elo - a.elo;
  if (b.fullWins !== a.fullWins) return b.fullWins - a.fullWins;
  return playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster));
}

export function computeMatchValueRankings(
  matches: readonly IntraSquadMatch[],
  roster: readonly RosterPlayer[],
): MatchValueRankingRow[] {
  const standings = computeMatchValueStandings(matches);
  const elo = rebuildEloFromMatches(matches);

  const rows: MatchValueRankingRow[] = roster.map((player) => {
    const standing = standings.get(player.id) ?? emptyStanding(player.id);
    return {
      ...standing,
      rank: 0,
      elo: eloRatingForPlayer(elo, player.id),
    };
  });

  rows.sort((a, b) => compareMatchValueRankings(a, b, roster));
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function formatMatchValue(value: number, { emptyWhenZeroMatches = false, matchesPlayed = 1 } = {}): string {
  if (emptyWhenZeroMatches && matchesPlayed <= 0) return EMPTY_VALUE;
  const rounded = Math.round(value * 100) / 100;
  const body = Math.abs(rounded).toFixed(2);
  if (rounded > 0) return `+${body}`;
  if (rounded < 0) return `-${body}`;
  return "0.00";
}

export function formatFullMatchRecord(row: Pick<MatchValuePlayerStanding, "fullWins" | "fullLosses">): string {
  return `${row.fullWins}–${row.fullLosses}`;
}

export function formatOneSetRecord(row: Pick<MatchValuePlayerStanding, "oneSetWins" | "oneSetLosses">): string {
  return `${row.oneSetWins}–${row.oneSetLosses}`;
}

export function formatSetsRecord(row: Pick<MatchValuePlayerStanding, "setsWon" | "setsLost">): string {
  return `${row.setsWon}–${row.setsLost}`;
}

export function formatSignedDiff(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return "0";
}

export function formatMatchValueResultLabel(outcome: PlayerMatchOutcome): string {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
