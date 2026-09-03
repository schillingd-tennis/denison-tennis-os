"use client";

import EmptyState from "@/components/EmptyState";

import { formatPlayedAtLabel } from "../display";
import {
  formatEloChangeFromStart,
  formatEloRating,
  type EloRankingRow,
} from "../elo";
import { formatUnfinishedRecord, formatWinLoss, playerNameFor } from "../records";
import type { RosterPlayer } from "../types";
import IntraSquadPlayerName from "./IntraSquadPlayerName";

export default function EloRankingsTable({
  rows,
  roster,
  onSelectPlayer,
}: {
  rows: EloRankingRow[];
  roster: RosterPlayer[];
  onSelectPlayer?: (playerId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title="No Elo rankings yet"
        description="Active roster players appear here once the roster loads."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
      <table className="w-full min-w-[42rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/70 bg-background/40">
            {["Rank", "Player", "Elo", "Change", "Matches", "W-L", "UF", "Last Match"].map((label) => (
              <th
                key={label}
                className="px-3 py-2 text-[11px] font-semibold tracking-wide text-text-secondary"
              >
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
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                {formatEloRating(row.rating)}
              </td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                {formatEloChangeFromStart(row.changeFromStart, row.matchesPlayed)}
              </td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{row.matchesPlayed}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatWinLoss(row)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                {formatUnfinishedRecord(row)}
              </td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-secondary">
                {row.lastMatchAt ? formatPlayedAtLabel(row.lastMatchAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
