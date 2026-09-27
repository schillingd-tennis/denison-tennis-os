import { sortMatchesNewestFirst } from "./display";
import { matchParticipantIds } from "./matchPlayers";
import { playerNameFor, playerResultsFromMatch } from "./records";
import type { IntraSquadMatch, RosterPlayer } from "./types";

export type HeadToHeadRecord = {
  playerId: string;
  opponentId: string;
  wins: number;
  losses: number;
  unfinished: number;
  matches: IntraSquadMatch[];
};

export type HeadToHeadPlayer = {
  playerId: string;
  wins: number;
  losses: number;
  unfinished: number;
  winPct: number | null;
};

function pairKey(leftId: string, rightId: string): string {
  return [leftId, rightId].sort().join("::");
}

export function buildHeadToHeadRecords(
  matches: readonly IntraSquadMatch[],
): Map<string, HeadToHeadRecord> {
  const records = new Map<string, HeadToHeadRecord>();

  for (const match of sortMatchesNewestFirst(matches)) {
    const [leftId, rightId] = matchParticipantIds(match);
    if (!leftId || !rightId || leftId === rightId) continue;

    for (const [playerId, opponentId] of [
      [leftId, rightId],
      [rightId, leftId],
    ] as const) {
      const key = pairKey(playerId, opponentId) + `::${playerId}`;
      const current = records.get(key) ?? {
        playerId,
        opponentId,
        wins: 0,
        losses: 0,
        unfinished: 0,
        matches: [],
      };
      const result = playerResultsFromMatch(match).find((row) => row.playerId === playerId);
      if (result?.outcome === "W") current.wins += 1;
      else if (result?.outcome === "L") current.losses += 1;
      else current.unfinished += 1;
      current.matches.push(match);
      records.set(key, current);
    }
  }

  return records;
}

export function headToHeadRecordFor(
  records: ReadonlyMap<string, HeadToHeadRecord>,
  playerId: string,
  opponentId: string,
): HeadToHeadRecord | null {
  return records.get(pairKey(playerId, opponentId) + `::${playerId}`) ?? null;
}

export function headToHeadPlayers(
  records: ReadonlyMap<string, HeadToHeadRecord>,
  roster: readonly RosterPlayer[],
): HeadToHeadPlayer[] {
  return roster
    .map((player) => {
      const rows = [...records.values()].filter((record) => record.playerId === player.id);
      const wins = rows.reduce((sum, record) => sum + record.wins, 0);
      const losses = rows.reduce((sum, record) => sum + record.losses, 0);
      const unfinished = rows.reduce((sum, record) => sum + record.unfinished, 0);
      const decided = wins + losses;
      return {
        playerId: player.id,
        wins,
        losses,
        unfinished,
        winPct: decided === 0 ? null : (wins / decided) * 100,
      };
    })
    .sort((left, right) => {
      const leftHasMatches = left.wins + left.losses + left.unfinished > 0;
      const rightHasMatches = right.wins + right.losses + right.unfinished > 0;
      if (leftHasMatches !== rightHasMatches) return leftHasMatches ? -1 : 1;
      if ((right.winPct ?? -1) !== (left.winPct ?? -1)) return (right.winPct ?? -1) - (left.winPct ?? -1);
      if (right.wins !== left.wins) return right.wins - left.wins;
      if (left.losses !== right.losses) return left.losses - right.losses;
      return playerNameFor(left.playerId, roster).localeCompare(playerNameFor(right.playerId, roster));
    });
}

export function uniqueHeadToHeadMatchupCount(matches: readonly IntraSquadMatch[]): number {
  return new Set(
    matches
      .map((match) => matchParticipantIds(match))
      .filter(([leftId, rightId]) => leftId && rightId && leftId !== rightId)
      .map(([leftId, rightId]) => pairKey(leftId, rightId)),
  ).size;
}
