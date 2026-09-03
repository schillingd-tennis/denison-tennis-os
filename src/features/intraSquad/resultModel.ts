import type { IntraSquadWeight, MatchStatus, PlayerMatchOutcome } from "./types";

export const UNFINISHED_RANKING_FACTOR = 0.5;

export const ELO_RESULT_SCORE = {
  completedWin: 1,
  completedLoss: 0,
  unfinishedLead: 0.75,
  unfinishedTrail: 0.25,
} as const;

export function rankingCreditForOutcome(
  outcome: PlayerMatchOutcome,
  weight: IntraSquadWeight,
): number {
  switch (outcome) {
    case "W":
      return weight;
    case "L":
      return -weight;
    case "leading":
      return UNFINISHED_RANKING_FACTOR * weight;
    case "trailing":
      return -UNFINISHED_RANKING_FACTOR * weight;
  }
}

export function eloScoreForOutcome(outcome: PlayerMatchOutcome): number {
  switch (outcome) {
    case "W":
      return ELO_RESULT_SCORE.completedWin;
    case "L":
      return ELO_RESULT_SCORE.completedLoss;
    case "leading":
      return ELO_RESULT_SCORE.unfinishedLead;
    case "trailing":
      return ELO_RESULT_SCORE.unfinishedTrail;
  }
}

export function outcomesForMatchStatus(
  status: MatchStatus,
): { primary: PlayerMatchOutcome; opponent: PlayerMatchOutcome } {
  if (status === "unfinished") {
    return { primary: "leading", opponent: "trailing" };
  }
  return { primary: "W", opponent: "L" };
}

export function formatSignedCredit(value: number): string {
  const abs = Math.abs(value);
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  if (value > 0) return `+${body}`;
  if (value < 0) return `-${body}`;
  return "0";
}

export function formatResultCredit(outcome: PlayerMatchOutcome, weight: IntraSquadWeight): string {
  const signed = formatSignedCredit(rankingCreditForOutcome(outcome, weight));
  switch (outcome) {
    case "W":
      return `W (${signed})`;
    case "L":
      return `L (${signed})`;
    case "leading":
      return `Leading (${signed})`;
    case "trailing":
      return `Trailing (${signed})`;
  }
}

export function formatMatchStatusLabel(status: MatchStatus): string {
  return status === "unfinished" ? "Unfinished" : "Completed";
}
