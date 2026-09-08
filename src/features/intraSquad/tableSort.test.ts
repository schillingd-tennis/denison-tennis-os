import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { getNextSortState, sortItems } from "@/components/data-table/sorting";
import type { ColumnDef } from "@/components/data-table/types";

import { computeEloRankings, ELO_STARTING_RATING, type EloRankingRow } from "./elo";
import { computeMatchValueRankings, type MatchValueRankingRow } from "./matchValue";
import { computeProvisionalRankings } from "./rankings";
import { computePlayerRecords, playerNameFor } from "./records";
import {
  ELO_DEFAULT_SORT,
  MATCH_VALUE_DEFAULT_SORT,
  PLAYER_RECORDS_DEFAULT_SORT,
  RANKINGS_DEFAULT_SORT,
  buildEloTableColumns,
  buildMatchValueTableColumns,
  buildPlayerRecordsTableColumns,
  buildRankingsTableColumns,
  compareWinsLossesPair,
  isValidSortKey,
  type EloSortKey,
  type MatchValueSortKey,
  type PlayerRecordsSortKey,
  type RankingsSortKey,
} from "./tableColumns";
import type { IntraSquadMatch, PlayerRecord, ProvisionalRankingRow, RosterPlayer } from "./types";

const roster: RosterPlayer[] = [
  { id: "arya", firstName: "Arya", lastName: "Ganapathy", preferredName: "Arya" },
  { id: "ben", firstName: "Ben", lastName: "Smith", preferredName: "Ben" },
  { id: "chris", firstName: "Chris", lastName: "Lee", preferredName: "Chris" },
  { id: "drew", firstName: "Drew", lastName: "Ng", preferredName: "Drew" },
];

function match(partial: Partial<IntraSquadMatch> & Pick<IntraSquadMatch, "id">): IntraSquadMatch {
  return {
    winnerPlayerId: "arya",
    loserPlayerId: "ben",
    leaderPlayerId: null,
    trailingPlayerId: null,
    status: "completed",
    scoreText: "6-1, 6-2",
    scoreSets: [
      { winnerGames: 6, loserGames: 1 },
      { winnerGames: 6, loserGames: 2 },
    ],
    weight: 1,
    sourceText: null,
    playedAt: "2026-03-01T12:00:00.000Z",
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
    ...partial,
  };
}

const fixtures: IntraSquadMatch[] = [
  match({
    id: "m1",
    winnerPlayerId: "arya",
    loserPlayerId: "ben",
    playedAt: "2026-03-01T12:00:00.000Z",
  }),
  match({
    id: "m2",
    winnerPlayerId: "arya",
    loserPlayerId: "chris",
    scoreText: "6-4",
    scoreSets: [{ winnerGames: 6, loserGames: 4 }],
    playedAt: "2026-03-05T12:00:00.000Z",
  }),
  match({
    id: "m3",
    winnerPlayerId: "ben",
    loserPlayerId: "chris",
    playedAt: "2026-03-10T12:00:00.000Z",
  }),
];

const records = computePlayerRecords(fixtures);
const rankings = computeProvisionalRankings(fixtures, records, roster);
const eloRankings = computeEloRankings(fixtures, records, roster);
const matchValueRankings = computeMatchValueRankings(fixtures, roster);
const eloByPlayerId = new Map(eloRankings.map((row) => [row.playerId, row.rating]));

const rankingsColumns = buildRankingsTableColumns(roster, eloByPlayerId);
const recordsColumns = buildPlayerRecordsTableColumns(roster);
const matchValueColumns = buildMatchValueTableColumns(roster);
const eloColumns = buildEloTableColumns(roster);

const rankingsTableSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/PlayerRecordsTable.tsx"),
  "utf8",
);
const matchValueTableSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/MatchValueRankingsTable.tsx"),
  "utf8",
);
const eloTableSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/EloRankingsTable.tsx"),
  "utf8",
);
const sortableHeaderSource = readFileSync(
  path.join(process.cwd(), "src/components/data-table/SortableColumnHeader.tsx"),
  "utf8",
);
const rankingsSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/rankings.ts"),
  "utf8",
);
const matchValueSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/matchValue.ts"),
  "utf8",
);
const eloSource = readFileSync(path.join(process.cwd(), "src/features/intraSquad/elo.ts"), "utf8");
const recordsSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/records.ts"),
  "utf8",
);

function ids<T extends { playerId: string }>(rows: readonly T[]): string[] {
  return rows.map((row) => row.playerId);
}

function nameTie<T extends { playerId: string }>(a: T, b: T): number {
  return playerNameFor(a.playerId, roster).localeCompare(playerNameFor(b.playerId, roster));
}

function sortWithNameTie<T, Key extends string>(
  items: T[],
  sort: Parameters<typeof sortItems<T, Key>>[1],
  columns: ColumnDef<T, Key>[],
): T[] {
  return sortItems(items, sort, columns, { tieBreaker: nameTie as (a: T, b: T) => number });
}

function cycleSort<T, Key extends string>(
  items: T[],
  columns: ColumnDef<T, Key>[],
  key: Key,
) {
  const column = columns.find((candidate) => candidate.id === key)!;
  const first = getNextSortState(null, column);
  const second = getNextSortState(first, column);
  const third = getNextSortState(second, column);
  return {
    column,
    first,
    second,
    third,
    firstSorted: sortItems(items, first, columns),
    secondSorted: sortItems(items, second, columns),
  };
}

describe("intra-squad sortable tab columns", () => {
  it("1. Rankings — every visible data header is sortable", () => {
    assert.deepEqual(
      rankingsColumns.map((column) => column.id),
      ["rank", "player", "wl", "winPct", "weightedPts", "elo"],
    );
    assert.ok(rankingsColumns.every((column) => column.sortable !== false));
    for (const title of ["Rank", "Player", "W-L", "Win %", "Weighted Pts", "Elo"]) {
      assert.match(rankingsTableSource, new RegExp(`label="${title}"`));
    }
  });

  it("2. Player Records — every visible data header is sortable", () => {
    assert.deepEqual(
      recordsColumns.map((column) => column.id),
      ["player", "matches", "wl", "uf", "winPct", "weightedWins", "weightedLosses", "weightedNet"],
    );
    assert.ok(recordsColumns.every((column) => column.sortable !== false));
    for (const title of [
      "Player",
      "Matches",
      "W-L",
      "UF",
      "Win %",
      "Weighted W",
      "Weighted L",
      "Weighted Net",
    ]) {
      assert.match(rankingsTableSource, new RegExp(`label="${title}"`));
    }
  });

  it("3. Match Value — every visible data header is sortable", () => {
    assert.deepEqual(
      matchValueColumns.map((column) => column.id),
      [
        "rank",
        "player",
        "matchValue",
        "fullWl",
        "oneSetWl",
        "uf",
        "setsWl",
        "setDiff",
        "gameDiff",
        "avgWeight",
        "elo",
      ],
    );
    assert.ok(matchValueColumns.every((column) => column.sortable !== false));
    for (const title of [
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
    ]) {
      assert.match(matchValueTableSource, new RegExp(`label="${title}"`));
    }
  });

  it("4. Elo Rankings — every visible data header is sortable", () => {
    assert.deepEqual(
      eloColumns.map((column) => column.id),
      ["rank", "player", "elo", "change", "matches", "wl", "uf", "lastMatch"],
    );
    assert.ok(eloColumns.every((column) => column.sortable !== false));
    for (const title of ["Rank", "Player", "Elo", "Change", "Matches", "W-L", "UF", "Last Match"]) {
      assert.match(eloTableSource, new RegExp(`label="${title}"`));
    }
  });

  it("5. click cycle uses column defaultSort then reverse then clear (OS convention)", () => {
    const { first, second, third, column } = cycleSort(rankings, rankingsColumns, "elo");
    assert.equal(column.defaultSort, "desc");
    assert.deepEqual(first, { key: "elo", direction: "desc" });
    assert.deepEqual(second, { key: "elo", direction: "asc" });
    assert.equal(third, null);

    const rankCycle = cycleSort(rankings, rankingsColumns, "rank");
    assert.deepEqual(rankCycle.first, { key: "rank", direction: "asc" });
    assert.deepEqual(rankCycle.second, { key: "rank", direction: "desc" });
  });

  it("6. numeric columns sort numerically (not string)", () => {
    const rows: PlayerRecord[] = [
      { ...records[0]!, playerId: "a", matchesPlayed: 2, weightedNet: 10 },
      { ...records[0]!, playerId: "b", matchesPlayed: 11, weightedNet: 2 },
      { ...records[0]!, playerId: "c", matchesPlayed: 3, weightedNet: 11 },
    ];
    const columns = buildPlayerRecordsTableColumns(roster);
    const byMatches = sortItems(rows, { key: "matches", direction: "asc" }, columns);
    assert.deepEqual(
      byMatches.map((row) => row.matchesPlayed),
      [2, 3, 11],
    );
    const byNet = sortItems(rows, { key: "weightedNet", direction: "desc" }, columns);
    assert.deepEqual(
      byNet.map((row) => row.weightedNet),
      [11, 10, 2],
    );
  });

  it("7. Win % sorts by underlying number; nulls last both directions", () => {
    const rows: PlayerRecord[] = [
      {
        playerId: "ben",
        matchesPlayed: 2,
        wins: 1,
        losses: 1,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        winPct: 50,
        weightedWins: 1,
        weightedLosses: 1,
        weightedNet: 0,
      },
      {
        playerId: "arya",
        matchesPlayed: 2,
        wins: 2,
        losses: 0,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        winPct: 100,
        weightedWins: 2,
        weightedLosses: 0,
        weightedNet: 2,
      },
      {
        playerId: "drew",
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        winPct: null,
        weightedWins: 0,
        weightedLosses: 0,
        weightedNet: 0,
      },
    ];
    const columns = buildPlayerRecordsTableColumns(roster);
    const desc = sortWithNameTie(rows, { key: "winPct", direction: "desc" }, columns);
    assert.deepEqual(ids(desc), ["arya", "ben", "drew"]);
    const asc = sortWithNameTie(rows, { key: "winPct", direction: "asc" }, columns);
    assert.deepEqual(ids(asc), ["ben", "arya", "drew"]);
  });

  it("8. W-L / record columns sort by underlying wins then losses (not display string)", () => {
    assert.ok(compareWinsLossesPair(10, 2, 2, 10) > 0);
    assert.ok(compareWinsLossesPair(5, 1, 5, 3) > 0);

    const rows: PlayerRecord[] = [
      {
        playerId: "ben",
        matchesPlayed: 9,
        wins: 9,
        losses: 0,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        winPct: 100,
        weightedWins: 9,
        weightedLosses: 0,
        weightedNet: 9,
      },
      {
        playerId: "arya",
        matchesPlayed: 12,
        wins: 10,
        losses: 2,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        winPct: 83.3,
        weightedWins: 10,
        weightedLosses: 2,
        weightedNet: 8,
      },
      {
        playerId: "chris",
        matchesPlayed: 3,
        wins: 2,
        losses: 0,
        unfinishedLeading: 1,
        unfinishedTrailing: 0,
        winPct: 100,
        weightedWins: 2,
        weightedLosses: 0,
        weightedNet: 2,
      },
    ];
    const columns = buildPlayerRecordsTableColumns(roster);
    const sorted = sortWithNameTie(rows, { key: "wl", direction: "desc" }, columns);
    // Numeric: 10–2 before 9–0 before 2–0
    assert.deepEqual(ids(sorted), ["arya", "ben", "chris"]);
    // Alpha on "10–2" / "9–0" / "2–0" would put "9–0" ahead of "10–2" when sorting desc by string.
    const alphaDesc = [...rows]
      .sort((a, b) => formatWl(b).localeCompare(formatWl(a)))
      .map((row) => row.playerId);
    assert.notDeepEqual(ids(sorted), alphaDesc);
    assert.equal(alphaDesc[0], "ben");
  });

  it("9. dates sort chronologically (Last Match)", () => {
    const rows: EloRankingRow[] = [
      {
        rank: 1,
        playerId: "ben",
        rating: 1500,
        changeFromStart: 0,
        matchesPlayed: 1,
        wins: 0,
        losses: 1,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        lastMatchAt: "2026-03-10T12:00:00.000Z",
        history: [],
      },
      {
        rank: 2,
        playerId: "arya",
        rating: 1520,
        changeFromStart: 20,
        matchesPlayed: 1,
        wins: 1,
        losses: 0,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        lastMatchAt: "2026-03-01T12:00:00.000Z",
        history: [],
      },
      {
        rank: 3,
        playerId: "drew",
        rating: 1500,
        changeFromStart: 0,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        lastMatchAt: null,
        history: [],
      },
    ];
    const columns = buildEloTableColumns(roster);
    const asc = sortWithNameTie(rows, { key: "lastMatch", direction: "asc" }, columns);
    assert.deepEqual(ids(asc), ["arya", "ben", "drew"]);
    const desc = sortWithNameTie(rows, { key: "lastMatch", direction: "desc" }, columns);
    assert.deepEqual(ids(desc), ["ben", "arya", "drew"]);
  });

  it("10. rank asc puts 1 before 2; Elo/Match Value use underlying numbers", () => {
    const byRank = sortItems(rankings, RANKINGS_DEFAULT_SORT, rankingsColumns);
    assert.deepEqual(
      byRank.map((row) => row.rank),
      [...byRank.map((row) => row.rank)].sort((a, b) => a - b),
    );
    assert.equal(byRank[0]?.rank, 1);

    const byElo = sortItems(eloRankings, ELO_DEFAULT_SORT, eloColumns);
    for (let i = 1; i < byElo.length; i += 1) {
      assert.ok(byElo[i - 1]!.rating >= byElo[i]!.rating);
    }

    const byMv = sortItems(matchValueRankings, MATCH_VALUE_DEFAULT_SORT, matchValueColumns);
    const played = byMv.filter((row) => row.matchesPlayed > 0);
    for (let i = 1; i < played.length; i += 1) {
      assert.ok(played[i - 1]!.totalMatchValue >= played[i]!.totalMatchValue);
    }
  });

  it("11. missing values stay at bottom for BOTH directions (no zero coercion)", () => {
    const mvColumns = buildMatchValueTableColumns(roster);
    const zeroMatch = matchValueRankings.filter((row) => row.matchesPlayed === 0);
    assert.ok(zeroMatch.length > 0);

    const desc = sortWithNameTie(matchValueRankings, { key: "matchValue", direction: "desc" }, mvColumns);
    const asc = sortWithNameTie(matchValueRankings, { key: "matchValue", direction: "asc" }, mvColumns);
    for (const row of zeroMatch) {
      assert.ok(desc.slice(-zeroMatch.length).some((r) => r.playerId === row.playerId));
      assert.ok(asc.slice(-zeroMatch.length).some((r) => r.playerId === row.playerId));
    }

    const changeDesc = sortWithNameTie(eloRankings, { key: "change", direction: "desc" }, eloColumns);
    const changeAsc = sortWithNameTie(eloRankings, { key: "change", direction: "asc" }, eloColumns);
    const noMatchElo = eloRankings.filter((row) => row.matchesPlayed === 0);
    assert.ok(noMatchElo.length > 0);
    for (const row of noMatchElo) {
      assert.ok(changeDesc.slice(-noMatchElo.length).some((r) => r.playerId === row.playerId));
      assert.ok(changeAsc.slice(-noMatchElo.length).some((r) => r.playerId === row.playerId));
    }

    // Avg Weight nulls last
    const avgDesc = sortWithNameTie(matchValueRankings, { key: "avgWeight", direction: "desc" }, mvColumns);
    assert.equal(avgDesc.at(-1)?.averageWeight, null);
  });

  it("12. ties break by player name ascending (stable secondary)", () => {
    const tied: PlayerRecord[] = [
      {
        playerId: "chris",
        matchesPlayed: 1,
        wins: 1,
        losses: 0,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        winPct: 100,
        weightedWins: 1,
        weightedLosses: 0,
        weightedNet: 1,
      },
      {
        playerId: "arya",
        matchesPlayed: 1,
        wins: 1,
        losses: 0,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        winPct: 100,
        weightedWins: 1,
        weightedLosses: 0,
        weightedNet: 1,
      },
      {
        playerId: "ben",
        matchesPlayed: 1,
        wins: 1,
        losses: 0,
        unfinishedLeading: 0,
        unfinishedTrailing: 0,
        winPct: 100,
        weightedWins: 1,
        weightedLosses: 0,
        weightedNet: 1,
      },
    ];
    const columns = buildPlayerRecordsTableColumns(roster);
    const sorted = sortWithNameTie(tied, { key: "weightedNet", direction: "desc" }, columns);
    assert.deepEqual(
      sorted.map((row) => playerNameFor(row.playerId, roster)),
      ["Arya", "Ben", "Chris"],
    );
  });

  it("13. sort applies to full result set; tab defaults are independent / valid keys only", () => {
    assert.deepEqual(RANKINGS_DEFAULT_SORT, { key: "rank", direction: "asc" });
    assert.deepEqual(PLAYER_RECORDS_DEFAULT_SORT, { key: "player", direction: "asc" });
    assert.deepEqual(MATCH_VALUE_DEFAULT_SORT, { key: "matchValue", direction: "desc" });
    assert.deepEqual(ELO_DEFAULT_SORT, { key: "elo", direction: "desc" });

    assert.equal(isValidSortKey(RANKINGS_DEFAULT_SORT.key, rankingsColumns), true);
    assert.equal(isValidSortKey(MATCH_VALUE_DEFAULT_SORT.key, rankingsColumns), false);
    assert.equal(isValidSortKey("matchValue", eloColumns), false);
    assert.equal(isValidSortKey("lastMatch", matchValueColumns), false);

    // Invalid key across tabs leaves order unchanged (never applies foreign key).
    const before = rankings;
    const after = sortItems(
      before,
      { key: "matchValue" as unknown as RankingsSortKey, direction: "desc" },
      rankingsColumns,
    );
    assert.deepEqual(ids(after), ids(before));
  });

  it("14. a11y — SortableColumnHeader (aria-sort, button, icons) wired in all four tables", () => {
    assert.match(sortableHeaderSource, /aria-sort/);
    assert.match(sortableHeaderSource, /type="button"/);
    assert.match(sortableHeaderSource, /ArrowUp|ArrowDown|ChevronsUpDown/);
    assert.match(sortableHeaderSource, /focus-visible:ring/);

    for (const source of [rankingsTableSource, matchValueTableSource, eloTableSource]) {
      assert.match(source, /SortableColumnHeader/);
      assert.match(source, /useSortableData/);
      assert.match(source, /toggleSort/);
    }
  });

  it("15. non-sortable Actions/menus/checkboxes — none present on these four tabs", () => {
    for (const source of [rankingsTableSource, matchValueTableSource, eloTableSource]) {
      assert.doesNotMatch(source, /label="Actions"/);
      assert.doesNotMatch(source, /type="checkbox"/);
    }
  });

  it("16. calculation modules unchanged by sort wiring (formulas/guardrails)", () => {
    assert.match(rankingsSource, /compareProvisionalRankings/);
    assert.match(rankingsSource, /weightedNet/);
    assert.match(matchValueSource, /MATCH_VALUE_FULL_BASE/);
    assert.match(matchValueSource, /computeMatchValueRankings/);
    assert.match(eloSource, /ELO_STARTING_RATING/);
    assert.match(eloSource, /rebuildEloFromMatches/);
    assert.match(recordsSource, /computePlayerRecords/);
    // Sort module does not redefine formula constants.
    const tableColumnsSource = readFileSync(
      path.join(process.cwd(), "src/features/intraSquad/tableColumns.ts"),
      "utf8",
    );
    assert.doesNotMatch(tableColumnsSource, /MATCH_VALUE_FULL_BASE|ELO_K_BY_WEIGHT|weightedNet\s*\+/);
  });

  it("17. default sort per tab matches preserved useful defaults", () => {
    const ranked = sortWithNameTie(rankings, RANKINGS_DEFAULT_SORT, rankingsColumns);
    assert.deepEqual(
      ranked.map((row) => row.rank),
      rankings.map((row) => row.rank).sort((a, b) => a - b),
    );

    const byPlayer = sortWithNameTie(records, PLAYER_RECORDS_DEFAULT_SORT, recordsColumns);
    assert.deepEqual(
      byPlayer.map((row) => playerNameFor(row.playerId, roster)),
      [...byPlayer.map((row) => playerNameFor(row.playerId, roster))].sort((a, b) =>
        a.localeCompare(b),
      ),
    );

    const byMv = sortWithNameTie(matchValueRankings, MATCH_VALUE_DEFAULT_SORT, matchValueColumns);
    assert.equal(byMv[0]?.playerId, matchValueRankings[0]?.playerId);

    const byElo = sortWithNameTie(eloRankings, ELO_DEFAULT_SORT, eloColumns);
    assert.equal(byElo[0]?.playerId, eloRankings[0]?.playerId);
  });

  it("18. text player sort is locale case-insensitive trim", () => {
    const rows: PlayerRecord[] = [
      { ...emptyRecord("ben"), playerId: "ben" },
      { ...emptyRecord("arya"), playerId: "arya" },
    ];
    const columns = buildPlayerRecordsTableColumns([
      { id: "ben", firstName: " ben ", lastName: "Smith", preferredName: " Ben " },
      { id: "arya", firstName: "ARYA", lastName: "G", preferredName: "arya" },
    ]);
    const sorted = sortItems(rows, { key: "player", direction: "asc" }, columns);
    assert.deepEqual(ids(sorted), ["arya", "ben"]);
  });

  it("19. mobile uses the same tables (no separate card list; overflow-x-auto preserved)", () => {
    for (const source of [rankingsTableSource, matchValueTableSource, eloTableSource]) {
      assert.match(source, /overflow-x-auto/);
      assert.doesNotMatch(source, /md:hidden/);
      assert.doesNotMatch(source, /MobileSort|sort control/i);
    }
  });

  it("20. Elo change / Match Value missing never coerced to zero for sorting", () => {
    const changeCol = eloColumns.find((column) => column.id === "change")!;
    const zeroMatch = eloRankings.find((row) => row.matchesPlayed === 0)!;
    assert.equal(changeCol.accessor?.(zeroMatch), null);
    assert.notEqual(zeroMatch.changeFromStart, undefined);

    const mvCol = matchValueColumns.find((column) => column.id === "matchValue")!;
    const unplayed = matchValueRankings.find((row) => row.matchesPlayed === 0)!;
    assert.equal(mvCol.accessor?.(unplayed), null);
    assert.equal(unplayed.totalMatchValue, 0);
  });
});

function formatWl(row: Pick<PlayerRecord, "wins" | "losses">): string {
  return `${row.wins}–${row.losses}`;
}

function emptyRecord(playerId: string): PlayerRecord {
  return {
    playerId,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    unfinishedLeading: 0,
    unfinishedTrailing: 0,
    winPct: null,
    weightedWins: 0,
    weightedLosses: 0,
    weightedNet: 0,
  };
}

// Type-only anchors so defaults stay keyed correctly under refactors.
void (null as unknown as ProvisionalRankingRow);
void (null as unknown as MatchValueRankingRow);
void (null as unknown as EloSortKey | MatchValueSortKey | PlayerRecordsSortKey | RankingsSortKey);
void ELO_STARTING_RATING;
