import EmptyState from "@/components/EmptyState";

import { ELO_STARTING_RATING, formatEloRating } from "../elo";
import { formatUnfinishedRecord, formatWinLoss, playerNameFor } from "../records";
import type { PlayerRecord, RosterPlayer } from "../types";
import IntraSquadPlayerName from "./IntraSquadPlayerName";
import { formatWinPct } from "./IntraSquadSummaryCards";

export default function PlayerRecordsTable({
  records,
  roster,
  onSelectPlayer,
}: {
  records: PlayerRecord[];
  roster: RosterPlayer[];
  onSelectPlayer?: (playerId: string) => void;
}) {
  if (records.length === 0) {
    return (
      <EmptyState
        compact
        title="No player records yet"
        description="Records are calculated from stored intra-squad matches."
      />
    );
  }

  const sorted = [...records].sort((a, b) =>
    playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster)),
  );

  return (
    <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/70 bg-background/40">
            {["Player", "Matches", "W-L", "UF", "Win %", "Weighted W", "Weighted L", "Weighted Net"].map((label) => (
              <th key={label} className="px-3 py-2 text-[11px] font-semibold tracking-wide text-text-secondary">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((record) => (
            <tr key={record.playerId} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 text-sm">
                <IntraSquadPlayerName onClick={onSelectPlayer ? () => onSelectPlayer(record.playerId) : undefined}>
                  {playerNameFor(record.playerId, roster)}
                </IntraSquadPlayerName>
              </td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{record.matchesPlayed}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatWinLoss(record)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatUnfinishedRecord(record)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatWinPct(record.winPct)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{record.weightedWins}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{record.weightedLosses}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                {record.weightedNet > 0 ? `+${record.weightedNet}` : String(record.weightedNet)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RankingsTable({
  rows,
  roster,
  eloByPlayerId,
  onSelectPlayer,
}: {
  rows: import("../types").ProvisionalRankingRow[];
  roster: RosterPlayer[];
  eloByPlayerId: ReadonlyMap<string, number>;
  onSelectPlayer?: (playerId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title="No rankings yet"
        description="Provisional rankings use Weighted Net, then Win %, then Wins."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/70 bg-background/40">
            {["Rank", "Player", "W-L", "Win %", "Weighted Pts", "Elo"].map((label) => (
              <th key={label} className="px-3 py-2 text-[11px] font-semibold tracking-wide text-text-secondary">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.playerId} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{row.rank}</td>
              <td className="px-3 py-2 text-sm">
                <IntraSquadPlayerName onClick={onSelectPlayer ? () => onSelectPlayer(row.playerId) : undefined}>
                  {playerNameFor(row.playerId, roster)}
                </IntraSquadPlayerName>
              </td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatWinLoss(row)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatWinPct(row.winPct)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                {row.weightedNet > 0 ? `+${row.weightedNet}` : String(row.weightedNet)}
              </td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                {formatEloRating(eloByPlayerId.get(row.playerId) ?? ELO_STARTING_RATING)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
