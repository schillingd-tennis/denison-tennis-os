import { playerNameFor } from "./records";
import type { IntraSquadMatch, PlayerRecord, ProvisionalRankingRow, RosterPlayer } from "./types";

export function compareProvisionalRankings(
  a: PlayerRecord,
  b: PlayerRecord,
  roster: readonly RosterPlayer[],
): number {
  if (b.weightedNet !== a.weightedNet) return b.weightedNet - a.weightedNet;
  const aPct = a.winPct ?? -1;
  const bPct = b.winPct ?? -1;
  if (bPct !== aPct) return bPct - aPct;
  if (b.wins !== a.wins) return b.wins - a.wins;
  return playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster));
}

export function computeProvisionalRankings(
  _matches: readonly IntraSquadMatch[],
  records: readonly PlayerRecord[],
  roster: readonly RosterPlayer[],
): ProvisionalRankingRow[] {
  return [...records]
    .sort((a, b) => compareProvisionalRankings(a, b, roster))
    .map((record, index) => ({ ...record, rank: index + 1 }));
}

export function topProvisionalRankings(
  matches: readonly IntraSquadMatch[],
  records: readonly PlayerRecord[],
  roster: readonly RosterPlayer[],
  limit = 5,
): ProvisionalRankingRow[] {
  return computeProvisionalRankings(matches, records, roster).slice(0, limit);
}
