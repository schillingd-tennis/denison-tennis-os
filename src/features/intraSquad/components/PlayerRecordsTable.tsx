"use client";

import { useCallback, useMemo } from "react";

import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import { useSortableData } from "@/components/data-table/useSortableData";
import EmptyState from "@/components/EmptyState";

import { ELO_STARTING_RATING, formatEloRating } from "../elo";
import { formatUnfinishedRecord, formatWinLoss, playerNameFor } from "../records";
import {
  INTRA_SQUAD_TABLE_HEADER,
  PLAYER_RECORDS_DEFAULT_SORT,
  RANKINGS_DEFAULT_SORT,
  buildPlayerRecordsTableColumns,
  buildRankingsTableColumns,
  type PlayerRecordsSortKey,
  type RankingsSortKey,
} from "../tableColumns";
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
  const columns = useMemo(() => buildPlayerRecordsTableColumns(roster), [roster]);
  const nameOrdered = useMemo(
    () =>
      [...records].sort((a, b) =>
        playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster)),
      ),
    [records, roster],
  );
  const tieBreaker = useCallback(
    (a: PlayerRecord, b: PlayerRecord) =>
      playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster)),
    [roster],
  );
  const { sortedItems, sort, toggleSort } = useSortableData(nameOrdered, columns, {
    getInitialSort: () => PLAYER_RECORDS_DEFAULT_SORT,
    tieBreaker,
  });

  if (records.length === 0) {
    return (
      <EmptyState
        compact
        title="No player records yet"
        description="Records are calculated from stored intra-squad matches."
      />
    );
  }

  function sortDirection(columnId: PlayerRecordsSortKey) {
    return sort?.key === columnId ? sort.direction : null;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/70 bg-background/40">
            <SortableColumnHeader
              label="Player"
              titleCase
              sortDirection={sortDirection("player")}
              onSort={() => toggleSort("player")}
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
              label="Win %"
              titleCase
              sortDirection={sortDirection("winPct")}
              onSort={() => toggleSort("winPct")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Weighted W"
              titleCase
              sortDirection={sortDirection("weightedWins")}
              onSort={() => toggleSort("weightedWins")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Weighted L"
              titleCase
              sortDirection={sortDirection("weightedLosses")}
              onSort={() => toggleSort("weightedLosses")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Weighted Net"
              titleCase
              sortDirection={sortDirection("weightedNet")}
              onSort={() => toggleSort("weightedNet")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((record) => (
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
  const columns = useMemo(
    () => buildRankingsTableColumns(roster, eloByPlayerId),
    [roster, eloByPlayerId],
  );
  const tieBreaker = useCallback(
    (a: { playerId: string }, b: { playerId: string }) =>
      playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster)),
    [roster],
  );
  const { sortedItems, sort, toggleSort } = useSortableData(rows, columns, {
    getInitialSort: () => RANKINGS_DEFAULT_SORT,
    tieBreaker,
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title="No rankings yet"
        description="Provisional rankings use Weighted Net, then Win %, then Wins."
      />
    );
  }

  function sortDirection(columnId: RankingsSortKey) {
    return sort?.key === columnId ? sort.direction : null;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border/80 bg-surface">
      <table className="w-full min-w-[36rem] border-collapse text-left">
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
              label="W-L"
              titleCase
              sortDirection={sortDirection("wl")}
              onSort={() => toggleSort("wl")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Win %"
              titleCase
              sortDirection={sortDirection("winPct")}
              onSort={() => toggleSort("winPct")}
              className={INTRA_SQUAD_TABLE_HEADER}
            />
            <SortableColumnHeader
              label="Weighted Pts"
              titleCase
              sortDirection={sortDirection("weightedPts")}
              onSort={() => toggleSort("weightedPts")}
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
