"use client";

import EmptyState from "@/components/EmptyState";

import { formatEloRating } from "../elo";
import {
  formatFullMatchRecord,
  formatMatchValue,
  formatOneSetRecord,
  formatSetsRecord,
  formatSignedDiff,
  type MatchValueRankingRow,
} from "../matchValue";
import { formatUnfinishedRecord, playerNameFor } from "../records";
import type { RosterPlayer } from "../types";
import IntraSquadPlayerName from "./IntraSquadPlayerName";

export default function MatchValueRankingsTable({
  rows,
  roster,
  onSelectPlayer,
}: {
  rows: MatchValueRankingRow[];
  roster: RosterPlayer[];
  onSelectPlayer?: (playerId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title="No Match Value rankings yet"
        description="Active roster players appear here once the roster loads."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
      <table className="w-full min-w-[56rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/70 bg-background/40">
            {[
              "Rank",
              "Player",
              "Match Value",
              "Full W-L",
              "1-Set W-L",
              "UF",
              "Sets W-L",
              "Set Diff",
              "Game Diff",
              "Avg Weight",
              "Elo",
            ].map((label) => (
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
                {formatMatchValue(row.totalMatchValue, {
                  emptyWhenZeroMatches: true,
                  matchesPlayed: row.matchesPlayed,
                })}
              </td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatFullMatchRecord(row)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatOneSetRecord(row)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatUnfinishedRecord(row)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatSetsRecord(row)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatSignedDiff(row.setDiff)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatSignedDiff(row.gameDiff)}</td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">
                {row.averageWeight == null ? "—" : row.averageWeight.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-sm tabular-nums text-text-primary">{formatEloRating(row.elo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
