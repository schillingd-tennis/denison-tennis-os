"use client";

import { useCallback, useMemo } from "react";

import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import { useSortableData } from "@/components/data-table/useSortableData";
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
import {
  INTRA_SQUAD_TABLE_HEADER,
  MATCH_VALUE_DEFAULT_SORT,
  buildMatchValueTableColumns,
  type MatchValueSortKey,
} from "../tableColumns";
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
  const columns = useMemo(() => buildMatchValueTableColumns(roster), [roster]);
  const tieBreaker = useCallback(
    (a: MatchValueRankingRow, b: MatchValueRankingRow) =>
      playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster)),
    [roster],
  );
  const { sortedItems, sort, toggleSort } = useSortableData(rows, columns, {
    getInitialSort: () => MATCH_VALUE_DEFAULT_SORT,
    tieBreaker,
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title="No Match Value rankings yet"
        description="Active roster players appear here once the roster loads."
      />
    );
  }

  function sortDirection(columnId: MatchValueSortKey) {
    return sort?.key === columnId ? sort.direction : null;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
      <table className="w-full min-w-[56rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/70 bg-background/40">
            <SortableColumnHeader
              label="Rank"
              titleCase
              sortDirection={sortDirection("rank")}
              onSort={() => toggleSort("rank")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Player"
              titleCase
              sortDirection={sortDirection("player")}
              onSort={() => toggleSort("player")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Match Value"
              titleCase
              sortDirection={sortDirection("matchValue")}
              onSort={() => toggleSort("matchValue")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Full W-L"
              titleCase
              sortDirection={sortDirection("fullWl")}
              onSort={() => toggleSort("fullWl")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="1-Set W-L"
              titleCase
              sortDirection={sortDirection("oneSetWl")}
              onSort={() => toggleSort("oneSetWl")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="UF"
              titleCase
              sortDirection={sortDirection("uf")}
              onSort={() => toggleSort("uf")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Sets W-L"
              titleCase
              sortDirection={sortDirection("setsWl")}
              onSort={() => toggleSort("setsWl")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Set Diff"
              titleCase
              sortDirection={sortDirection("setDiff")}
              onSort={() => toggleSort("setDiff")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Game Diff"
              titleCase
              sortDirection={sortDirection("gameDiff")}
              onSort={() => toggleSort("gameDiff")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Avg Weight"
              titleCase
              sortDirection={sortDirection("avgWeight")}
              onSort={() => toggleSort("avgWeight")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Elo"
              titleCase
              sortDirection={sortDirection("elo")}
              onSort={() => toggleSort("elo")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((row) => (
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
