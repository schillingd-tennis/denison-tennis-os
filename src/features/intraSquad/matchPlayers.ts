import type { IntraSquadMatch, MatchStatus } from "./types";

export function matchStatusOf(match: Pick<IntraSquadMatch, "status"> | { status?: MatchStatus }): MatchStatus {
  return match.status === "unfinished" ? "unfinished" : "completed";
}

export function isUnfinishedMatch(match: Pick<IntraSquadMatch, "status"> | { status?: MatchStatus }): boolean {
  return matchStatusOf(match) === "unfinished";
}

export function primaryPlayerId(match: IntraSquadMatch): string {
  return isUnfinishedMatch(match) ? (match.leaderPlayerId ?? "") : (match.winnerPlayerId ?? "");
}

export function opponentPlayerId(match: IntraSquadMatch): string {
  return isUnfinishedMatch(match) ? (match.trailingPlayerId ?? "") : (match.loserPlayerId ?? "");
}

export function matchParticipantIds(match: IntraSquadMatch): [string, string] {
  return [primaryPlayerId(match), opponentPlayerId(match)];
}
