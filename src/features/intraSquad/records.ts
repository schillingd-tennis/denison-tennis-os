import { formatScoreSets, invertScoreSets } from "./parseScore";
import {
  eloScoreForOutcome,
  formatResultCredit,
  outcomesForMatchStatus,
  rankingCreditForOutcome,
} from "./resultModel";
import { isUnfinishedMatch, matchParticipantIds, opponentPlayerId, primaryPlayerId } from "./matchPlayers";
import { findRosterPlayer, rosterPlayerShortName } from "./roster";
import type {
  IntraSquadMatch,
  IntraSquadWeight,
  PlayerMatchOutcome,
  PlayerMatchResult,
  PlayerRecord,
  RosterPlayer,
} from "./types";

export function signedWeight(outcome: "W" | "L", weight: IntraSquadWeight): number {
  return rankingCreditForOutcome(outcome, weight);
}

export function formatSignedResult(outcome: "W" | "L", weight: IntraSquadWeight): string {
  return formatResultCredit(outcome, weight);
}

export { formatResultCredit };

export function playerResultsFromMatch(
  match: IntraSquadMatch,
): [PlayerMatchResult, PlayerMatchResult] {
  const primaryId = primaryPlayerId(match);
  const opponentId = opponentPlayerId(match);
  const outcomes = outcomesForMatchStatus(isUnfinishedMatch(match) ? "unfinished" : "completed");
  const primaryScore = match.scoreText || formatScoreSets(match.scoreSets);
  const opponentScore = formatScoreSets(invertScoreSets(match.scoreSets));
  const status = isUnfinishedMatch(match) ? "unfinished" : "completed";

  function result(
    playerId: string,
    vsId: string,
    outcome: PlayerMatchOutcome,
    perspectiveScoreText: string,
  ): PlayerMatchResult {
    return {
      matchId: match.id,
      playerId,
      opponentId: vsId,
      status,
      outcome,
      weight: match.weight,
      weightedValue: rankingCreditForOutcome(outcome, match.weight),
      eloScore: eloScoreForOutcome(outcome),
      scoreText: primaryScore,
      perspectiveScoreText,
      playedAt: match.playedAt,
    };
  }

  return [
    result(primaryId, opponentId, outcomes.primary, primaryScore),
    result(opponentId, primaryId, outcomes.opponent, opponentScore),
  ];
}

function emptyRecord(playerId: string): PlayerRecord {
  return {
    playerId,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    unfinishedLeading: 0,
    unfinishedTrailing: 0,
    winPct: null,
    weightedWins: 0,
    weightedLosses: 0,
    weightedNet: 0,
  };
}

export function computePlayerRecords(matches: readonly IntraSquadMatch[]): PlayerRecord[] {
  const byId = new Map<string, PlayerRecord>();

  for (const match of matches) {
    const [primary, opponent] = playerResultsFromMatch(match);
    for (const result of [primary, opponent]) {
      if (!result.playerId) continue;
      const current = byId.get(result.playerId) ?? emptyRecord(result.playerId);
      current.matchesPlayed += 1;
      if (result.outcome === "W") {
        current.wins += 1;
        current.weightedWins += result.weight;
      } else if (result.outcome === "L") {
        current.losses += 1;
        current.weightedLosses += result.weight;
      } else if (result.outcome === "leading") {
        current.unfinishedLeading += 1;
      } else {
        current.unfinishedTrailing += 1;
      }
      current.weightedNet += result.weightedValue;
      byId.set(result.playerId, current);
    }
  }

  return [...byId.values()].map((record) => {
    const decided = record.wins + record.losses;
    return {
      ...record,
      winPct: decided === 0 ? null : (record.wins / decided) * 100,
    };
  });
}

export function playerNameFor(
  playerId: string | null | undefined,
  roster: readonly RosterPlayer[],
): string {
  if (!playerId) return "Unknown player";
  const player = findRosterPlayer(roster, playerId);
  if (!player) return "Unknown player";
  return rosterPlayerShortName(player, roster);
}

export function formatWinLoss(record: Pick<PlayerRecord, "wins" | "losses">): string {
  return `${record.wins}–${record.losses}`;
}

export function formatUnfinishedRecord(
  record: Pick<PlayerRecord, "unfinishedLeading" | "unfinishedTrailing">,
): string {
  return `${record.unfinishedLeading}–${record.unfinishedTrailing}`;
}

export function formatMatchHeadline(match: IntraSquadMatch, roster: readonly RosterPlayer[]): string {
  const [primary, opponent] = matchParticipantIds(match);
  const left = playerNameFor(primary, roster);
  const right = playerNameFor(opponent, roster);
  return isUnfinishedMatch(match) ? `${left} leading ${right}` : `${left} def. ${right}`;
}
