"use client";

import { useCallback, useMemo } from "react";

import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import { useSortableData } from "@/components/data-table/useSortableData";
import EmptyState from "@/components/EmptyState";

import { formatPlayedAtLabel } from "../display";
import {
  formatEloChangeFromStart,
  formatEloRating,
  type EloRankingRow,
} from "../elo";
import { formatUnfinishedRecord, formatWinLoss, playerNameFor } from "../records";
import {
  ELO_DEFAULT_SORT,
  INTRA_SQUAD_TABLE_HEADER,
  buildEloTableColumns,
  type EloSortKey,
} from "../tableColumns";
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
  const columns = useMemo(() => buildEloTableColumns(roster), [roster]);
  const tieBreaker = useCallback(
    (a: EloRankingRow, b: EloRankingRow) =>
      playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster)),
    [roster],
  );
  const { sortedItems, sort, toggleSort } = useSortableData(rows, columns, {
    getInitialSort: () => ELO_DEFAULT_SORT,
    tieBreaker,
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title="No Elo rankings yet"
        description="Active roster players appear here once the roster loads."
      />
    );
  }

  function sortDirection(columnId: EloSortKey) {
    return sort?.key === columnId ? sort.direction : null;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
      <table className="w-full min-w-[42rem] border-collapse text-left">
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
              label="Elo"
              titleCase
              sortDirection={sortDirection("elo")}
              onSort={() => toggleSort("elo")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Change"
              titleCase
              sortDirection={sortDirection("change")}
              onSort={() => toggleSort("change")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Matches"
              titleCase
              sortDirection={sortDirection("matches")}
              onSort={() => toggleSort("matches")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="W-L"
              titleCase
              sortDirection={sortDirection("wl")}
              onSort={() => toggleSort("wl")}
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
              label="Last Match"
              titleCase
              sortDirection={sortDirection("lastMatch")}
              onSort={() => toggleSort("lastMatch")}
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
