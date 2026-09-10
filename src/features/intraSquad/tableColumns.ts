import type { ColumnDef, SortState } from "@/components/data-table/types";
import { ELO_STARTING_RATING, type EloRankingRow } from "./elo";
import type { MatchValueRankingRow } from "./matchValue";
import { playerNameFor } from "./records";
import type { PlayerRecord, ProvisionalRankingRow, RosterPlayer } from "./types";

/** Matches existing Intra-Squad / Schedule dense header chrome (non-uppercase). */
export const INTRA_SQUAD_TABLE_HEADER =
  "px-3 py-2 text-[11px] font-semibold tracking-wide text-text-secondary";

/**
 * Ascending-space W–L comparison for `sortType: "custom"`:
 * more wins sorts higher; when wins tie, fewer losses sorts higher.
 * The shared engine applies asc/desc on top of this.
 */
export function compareWinsLossesPair(
  aWins: number,
  aLosses: number,
  bWins: number,
  bLosses: number,
): number {
  if (aWins !== bWins) return aWins - bWins;
  return bLosses - aLosses;
}

export type RankingsSortKey = "rank" | "player" | "wl" | "winPct" | "weightedPts" | "elo";

export type PlayerRecordsSortKey =
  | "player"
  | "matches"
  | "wl"
  | "uf"
  | "winPct"
  | "weightedWins"
  | "weightedLosses"
  | "weightedNet";

export type MatchValueSortKey =
  | "rank"
  | "player"
  | "matchValue"
  | "fullWl"
  | "oneSetWl"
  | "uf"
  | "setsWl"
  | "setDiff"
  | "gameDiff"
  | "avgWeight"
  | "elo";

export type EloSortKey =
  | "rank"
  | "player"
  | "elo"
  | "change"
  | "matches"
  | "wl"
  | "uf"
  | "lastMatch";

export const RANKINGS_DEFAULT_SORT: NonNullable<SortState<RankingsSortKey>> = {
  key: "rank",
  direction: "asc",
};

/** Existing Player Records order: name ascending. */
export const PLAYER_RECORDS_DEFAULT_SORT: NonNullable<SortState<PlayerRecordsSortKey>> = {
  key: "player",
  direction: "asc",
};

export const MATCH_VALUE_DEFAULT_SORT: NonNullable<SortState<MatchValueSortKey>> = {
  key: "matchValue",
  direction: "desc",
};

export const ELO_DEFAULT_SORT: NonNullable<SortState<EloSortKey>> = {
  key: "elo",
  direction: "desc",
};

export function buildRankingsTableColumns(
  roster: readonly RosterPlayer[],
  eloByPlayerId: ReadonlyMap<string, number>,
): ColumnDef<ProvisionalRankingRow, RankingsSortKey>[] {
  return [
    {
      id: "rank",
      title: "Rank",
      sortable: true,
      sortType: "number",
      defaultSort: "asc",
      accessor: (row) => row.rank,
    },
    {
      id: "player",
      title: "Player",
      sortable: true,
      sortType: "text",
      defaultSort: "asc",
      accessor: (row) => playerNameFor(row.playerId, roster),
    },
    {
      id: "wl",
      title: "W-L",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) => compareWinsLossesPair(a.wins, a.losses, b.wins, b.losses),
    },
    {
      id: "winPct",
      title: "Win %",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.winPct,
    },
    {
      id: "weightedPts",
      title: "Weighted Pts",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.weightedNet,
    },
    {
      id: "elo",
      title: "Elo",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => eloByPlayerId.get(row.playerId) ?? ELO_STARTING_RATING,
    },
  ];
}

export function buildPlayerRecordsTableColumns(
  roster: readonly RosterPlayer[],
): ColumnDef<PlayerRecord, PlayerRecordsSortKey>[] {
  return [
    {
      id: "player",
      title: "Player",
      sortable: true,
      sortType: "text",
      defaultSort: "asc",
      accessor: (row) => playerNameFor(row.playerId, roster),
    },
    {
      id: "matches",
      title: "Matches",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.matchesPlayed,
    },
    {
      id: "wl",
      title: "W-L",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) => compareWinsLossesPair(a.wins, a.losses, b.wins, b.losses),
    },
    {
      id: "uf",
      title: "UF",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) =>
        compareWinsLossesPair(
          a.unfinishedLeading,
          a.unfinishedTrailing,
          b.unfinishedLeading,
          b.unfinishedTrailing,
        ),
    },
    {
      id: "winPct",
      title: "Win %",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.winPct,
    },
    {
      id: "weightedWins",
      title: "Weighted W",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.weightedWins,
    },
    {
      id: "weightedLosses",
      title: "Weighted L",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.weightedLosses,
    },
    {
      id: "weightedNet",
      title: "Weighted Net",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.weightedNet,
    },
  ];
}

export function buildMatchValueTableColumns(
  roster: readonly RosterPlayer[],
): ColumnDef<MatchValueRankingRow, MatchValueSortKey>[] {
  return [
    {
      id: "rank",
      title: "Rank",
      sortable: true,
      sortType: "number",
      defaultSort: "asc",
      accessor: (row) => row.rank,
    },
    {
      id: "player",
      title: "Player",
      sortable: true,
      sortType: "text",
      defaultSort: "asc",
      accessor: (row) => playerNameFor(row.playerId, roster),
    },
    {
      id: "matchValue",
      title: "Match Value",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      // Missing when no matches — do not coerce 0.00 as a real value for sort.
      accessor: (row) => (row.matchesPlayed > 0 ? row.totalMatchValue : null),
    },
    {
      id: "fullWl",
      title: "Full W-L",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) => compareWinsLossesPair(a.fullWins, a.fullLosses, b.fullWins, b.fullLosses),
    },
    {
      id: "oneSetWl",
      title: "1-Set W-L",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) =>
        compareWinsLossesPair(a.oneSetWins, a.oneSetLosses, b.oneSetWins, b.oneSetLosses),
    },
    {
      id: "uf",
      title: "UF",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) =>
        compareWinsLossesPair(
          a.unfinishedLeading,
          a.unfinishedTrailing,
          b.unfinishedLeading,
          b.unfinishedTrailing,
        ),
    },
    {
      id: "setsWl",
      title: "Sets W-L",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) => compareWinsLossesPair(a.setsWon, a.setsLost, b.setsWon, b.setsLost),
    },
    {
      id: "setDiff",
      title: "Set Diff",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.setDiff,
    },
    {
      id: "gameDiff",
      title: "Game Diff",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.gameDiff,
    },
    {
      id: "avgWeight",
      title: "Avg Weight",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.averageWeight,
    },
    {
      id: "elo",
      title: "Elo",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.elo,
    },
  ];
}

export function buildEloTableColumns(
  roster: readonly RosterPlayer[],
): ColumnDef<EloRankingRow, EloSortKey>[] {
  return [
    {
      id: "rank",
      title: "Rank",
      sortable: true,
      sortType: "number",
      defaultSort: "asc",
      accessor: (row) => row.rank,
    },
    {
      id: "player",
      title: "Player",
      sortable: true,
      sortType: "text",
      defaultSort: "asc",
      accessor: (row) => playerNameFor(row.playerId, roster),
    },
    {
      id: "elo",
      title: "Elo",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.rating,
    },
    {
      id: "change",
      title: "Change",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      // Display is "—" with zero matches; do not sort those as 0.
      accessor: (row) => (row.matchesPlayed > 0 ? row.changeFromStart : null),
    },
    {
      id: "matches",
      title: "Matches",
      sortable: true,
      sortType: "number",
      defaultSort: "desc",
      accessor: (row) => row.matchesPlayed,
    },
    {
      id: "wl",
      title: "W-L",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) => compareWinsLossesPair(a.wins, a.losses, b.wins, b.losses),
    },
    {
      id: "uf",
      title: "UF",
      sortable: true,
      sortType: "custom",
      defaultSort: "desc",
      comparator: (a, b) =>
        compareWinsLossesPair(
          a.unfinishedLeading,
          a.unfinishedTrailing,
          b.unfinishedLeading,
          b.unfinishedTrailing,
        ),
    },
    {
      id: "lastMatch",
      title: "Last Match",
      sortable: true,
      sortType: "date",
      defaultSort: "desc",
      accessor: (row) => row.lastMatchAt,
    },
  ];
}

/** True when a stored/cross-tab sort key is valid for this column set. */
export function isValidSortKey<Key extends string>(
  key: string,
  columns: ReadonlyArray<{ id: Key }>,
): key is Key {
  return columns.some((column) => column.id === key);
}
