import { rebuildEloFromMatches, type EloHistoryEvent } from "./elo";
import { classifyMatchCompleteness } from "./matchValue";
import { playerNameFor } from "./records";
import type { IntraSquadMatch, IntraSquadWeight, PlayerMatchOutcome, RosterPlayer } from "./types";

export const PERFORMANCE_IMPORTANCE: Record<IntraSquadWeight, number> = {
  1: 1,
  2: 1.5,
  3: 2,
};

export type PerformanceConfidence = "High" | "Moderate" | "Building";

export type PerformanceMatch = {
  matchId: string;
  playedAt: string;
  opponentId: string;
  outcome: PlayerMatchOutcome;
  scoreText: string;
  importance: number;
  completion: number;
  completedEquivalent: number;
  actualResult: number;
  expectedResult: number;
  versusExpected: number;
  opponentRating: number;
  qualityWin: boolean;
};

export type PerformanceStanding = {
  rank: number;
  playerId: string;
  ips: number;
  adjustedWinPct: number;
  versusExpected: number;
  qualityWins: number;
  completedEquivalents: number;
  resultQuality: number;
  completionQuality: number;
  opponentStrength: number;
  averageImportance: number;
  confidence: PerformanceConfidence;
  matches: PerformanceMatch[];
};

export type PerformanceSummary = {
  standings: PerformanceStanding[];
  teamIps: number | null;
  completedEquivalents: number;
  qualityWins: number;
  confidence: PerformanceConfidence;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function importanceForWeight(weight: IntraSquadWeight): number {
  return PERFORMANCE_IMPORTANCE[weight];
}

export function completionFactor(match: IntraSquadMatch): number {
  const kind = classifyMatchCompleteness(match);
  if (kind === "full_completed") return 1;
  if (kind === "one_set_completed") return 0.45;

  const completedSets = match.scoreSets.filter((set) => {
    const high = Math.max(set.winnerGames, set.loserGames);
    const low = Math.min(set.winnerGames, set.loserGames);
    return (high >= 6 && high - low >= 2) || high === 7;
  }).length;
  const games = match.scoreSets.reduce((total, set) => total + set.winnerGames + set.loserGames, 0);
  return clamp(0.2 + completedSets * 0.2 + Math.min(games / 24, 1) * 0.1, 0.2, 0.65);
}

function confidenceFor(equivalents: number): PerformanceConfidence {
  if (equivalents >= 6) return "High";
  if (equivalents >= 3) return "Moderate";
  return "Building";
}

function performanceMatch(
  match: IntraSquadMatch,
  event: EloHistoryEvent,
  opponentEvent: EloHistoryEvent | undefined,
): PerformanceMatch {
  const importance = importanceForWeight(match.weight);
  const completion = completionFactor(match);
  return {
    matchId: match.id,
    playedAt: match.playedAt,
    opponentId: event.opponentId,
    outcome: event.outcome,
    scoreText: match.scoreText,
    importance,
    completion,
    completedEquivalent: importance * completion,
    actualResult: event.actualResult,
    expectedResult: event.expectedResult,
    versusExpected: event.actualResult - event.expectedResult,
    opponentRating: opponentEvent?.ratingBefore ?? 1500,
    qualityWin: event.outcome === "W" && event.expectedResult < 0.5,
  };
}

export function computePerformanceSummary(
  matches: readonly IntraSquadMatch[],
  roster: readonly RosterPlayer[],
): PerformanceSummary {
  const elo = rebuildEloFromMatches(matches);
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const eventByMatchAndPlayer = new Map(elo.events.map((event) => [`${event.matchId}:${event.playerId}`, event]));

  const rows = roster.map((player): PerformanceStanding => {
    const events = elo.events.filter((event) => event.playerId === player.id);
    const performanceMatches = events.flatMap((event) => {
      const match = matchById.get(event.matchId);
      if (!match) return [];
      const opponentEvent = eventByMatchAndPlayer.get(`${event.matchId}:${event.opponentId}`);
      return [performanceMatch(match, event, opponentEvent)];
    });
    const evidence = performanceMatches.reduce((sum, item) => sum + item.completedEquivalent, 0);
    const importanceExposure = performanceMatches.reduce((sum, item) => sum + item.importance, 0);
    const weightedActual = performanceMatches.reduce(
      (sum, item) => sum + item.actualResult * item.completedEquivalent,
      0,
    );
    const weightedExpectedDelta = performanceMatches.reduce(
      (sum, item) => sum + item.versusExpected * item.completedEquivalent,
      0,
    );
    const adjustedWinRate = evidence > 0 ? weightedActual / evidence : 0.5;
    const versusExpected = evidence > 0 ? weightedExpectedDelta / evidence : 0;
    const ips = evidence > 0
      ? clamp(50 + (adjustedWinRate - 0.5) * 70 + versusExpected * 20, 0, 100)
      : 0;
    const opponentStrength = evidence > 0
      ? performanceMatches.reduce(
          (sum, item) => sum + (1 - item.expectedResult) * item.completedEquivalent,
          0,
        ) / evidence * 100
      : 0;

    return {
      rank: 0,
      playerId: player.id,
      ips,
      adjustedWinPct: adjustedWinRate * 100,
      versusExpected: versusExpected * 100,
      qualityWins: performanceMatches.filter((item) => item.qualityWin).length,
      completedEquivalents: evidence,
      resultQuality: adjustedWinRate * 100,
      completionQuality: importanceExposure > 0 ? evidence / importanceExposure * 100 : 0,
      opponentStrength,
      averageImportance: performanceMatches.length
        ? importanceExposure / performanceMatches.length
        : 0,
      confidence: confidenceFor(evidence),
      matches: performanceMatches.sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    };
  });

  rows.sort((a, b) => {
    const aHas = a.matches.length ? 1 : 0;
    const bHas = b.matches.length ? 1 : 0;
    if (bHas !== aHas) return bHas - aHas;
    if (b.ips !== a.ips) return b.ips - a.ips;
    if (b.completedEquivalents !== a.completedEquivalents) {
      return b.completedEquivalents - a.completedEquivalents;
    }
    return playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster));
  });
  const standings = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  const active = standings.filter((row) => row.matches.length > 0);
  const totalEvidence = active.reduce((sum, row) => sum + row.completedEquivalents, 0);
  const teamIps = totalEvidence > 0
    ? active.reduce((sum, row) => sum + row.ips * row.completedEquivalents, 0) / totalEvidence
    : null;

  return {
    standings,
    teamIps,
    completedEquivalents: totalEvidence / 2,
    qualityWins: active.reduce((sum, row) => sum + row.qualityWins, 0),
    confidence: confidenceFor(totalEvidence / Math.max(active.length, 1)),
  };
}
