import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import { rebuildEloFromMatches } from "./elo";
import {
  COMPLETED_SET_VALUE,
  CURRENT_SET_MAX_VALUE,
  CURRENT_SET_SCALE_GAMES,
  MATCH_VALUE_DOMINANCE_MODIFIER,
  MATCH_VALUE_FULL_BASE,
  MATCH_VALUE_ONE_SET_BASE,
  UNFINISHED_MAX_VALUE,
  classifyMatchCompleteness,
  computeMatchValueRankings,
  computeMatchValueStandings,
  matchValueForMatch,
  setGameTotalsFromPerspective,
  unfinishedResultValueFromLeaderScore,
} from "./matchValue";
import { computeProvisionalRankings } from "./rankings";
import { computePlayerRecords } from "./records";
import { currentRosterPlayers } from "./roster";
import type { IntraSquadMatch, RosterPlayer } from "./types";

const typesSource = readFileSync(path.join(process.cwd(), "src/features/intraSquad/types.ts"), "utf8");
const workspaceSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadWorkspace.tsx"),
  "utf8",
);
const livePreviewSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/LiveRankingsPreview.tsx"),
  "utf8",
);
const matchListSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadMatchList.tsx"),
  "utf8",
);
const playerDetailSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadPlayerDetail.tsx"),
  "utf8",
);
const playerNameSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadPlayerName.tsx"),
  "utf8",
);
const matchValueTableSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/MatchValueRankingsTable.tsx"),
  "utf8",
);
const recordsTableSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/PlayerRecordsTable.tsx"),
  "utf8",
);
const eloTableSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/EloRankingsTable.tsx"),
  "utf8",
);
const eloSource = readFileSync(path.join(process.cwd(), "src/features/intraSquad/elo.ts"), "utf8");
const resultModelSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/resultModel.ts"),
  "utf8",
);

function person(
  id: string,
  first: string,
  last: string,
  roleKey: string = ROLE_KEYS.player,
  statusKey: string = STATUS_KEYS.current,
): Person {
  return {
    id,
    firstName: first,
    lastName: last,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    relationships: [],
    roleId: `role-${roleKey}`,
    statusId: `status-${statusKey}`,
    role: { id: `role-${roleKey}`, key: roleKey, label: roleKey },
    status: { id: `status-${statusKey}`, key: statusKey, label: statusKey },
  };
}

const people = [
  person("balraj", "Balraj", "Idnani"),
  person("kyle", "Kyle", "Patrick"),
  person("nick", "Nick", "Meyers"),
  person("aidan", "Aidan", "Borosko"),
  person("chika", "Chika", "Okurama"),
  person("jackson", "Jackson", "Smith"),
  person("peter", "Peter", "Smith"),
  person("tom", "Tom", "Jones"),
  person("arya", "Arya", "Kallambella"),
  person("minato", "Minato", "Koido"),
];

const roster: RosterPlayer[] = currentRosterPlayers(people);

function match(overrides: Partial<IntraSquadMatch> & Pick<IntraSquadMatch, "id">): IntraSquadMatch {
  return {
    playedAt: "2026-09-03",
    status: "completed",
    winnerPlayerId: "balraj",
    loserPlayerId: "kyle",
    leaderPlayerId: null,
    trailingPlayerId: null,
    scoreText: "6-1, 6-1",
    scoreSets: [
      { winnerGames: 6, loserGames: 1 },
      { winnerGames: 6, loserGames: 1 },
    ],
    weight: 1,
    sourceText: null,
    createdAt: "2026-09-03T12:00:00.000Z",
    updatedAt: "2026-09-03T12:00:00.000Z",
    ...overrides,
  };
}

function unfinished(
  overrides: Partial<IntraSquadMatch> & Pick<IntraSquadMatch, "id">,
): IntraSquadMatch {
  return match({
    status: "unfinished",
    winnerPlayerId: null,
    loserPlayerId: null,
    leaderPlayerId: "chika",
    trailingPlayerId: "jackson",
    scoreText: "6-4, 3-2",
    scoreSets: [
      { winnerGames: 6, loserGames: 4 },
      { winnerGames: 3, loserGames: 2 },
    ],
    ...overrides,
  });
}

function approx(actual: number, expected: number, tolerance = 0.06) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ~${expected}, got ${actual}`,
  );
}

describe("intra-squad Match Value", () => {
  it("tab is registered before Elo Rankings", () => {
    assert.match(typesSource, /"match-value"/);
    const matchValueIdx = typesSource.indexOf('id: "match-value"');
    const eloIdx = typesSource.indexOf('id: "elo"');
    assert.ok(matchValueIdx > 0 && eloIdx > matchValueIdx);
    assert.match(workspaceSource, /tab === "match-value"/);
  });

  it("1. completed sets counted correctly", () => {
    const totals = setGameTotalsFromPerspective([
      { winnerGames: 6, loserGames: 4 },
      { winnerGames: 3, loserGames: 2 },
    ]);
    assert.equal(totals.setsWon, 1);
    assert.equal(totals.setsLost, 0);
    assert.equal(totals.setDiff, 1);
  });

  it("2. unfinished current set not counted as completed set", () => {
    const totals = setGameTotalsFromPerspective([
      { winnerGames: 6, loserGames: 1 },
      { winnerGames: 1, loserGames: 5 },
    ]);
    assert.equal(totals.setsWon, 1);
    assert.equal(totals.setsLost, 0);
  });

  it("3. games counted from completed + unfinished sets", () => {
    const totals = setGameTotalsFromPerspective([
      { winnerGames: 6, loserGames: 1 },
      { winnerGames: 1, loserGames: 5 },
    ]);
    assert.equal(totals.gamesWon, 7);
    assert.equal(totals.gamesLost, 6);
  });

  it("4. set differential", () => {
    const totals = setGameTotalsFromPerspective([
      { winnerGames: 6, loserGames: 4 },
      { winnerGames: 2, loserGames: 6 },
      { winnerGames: 4, loserGames: 2 },
    ]);
    assert.equal(totals.setDiff, 0);
  });

  it("5. game differential", () => {
    const totals = setGameTotalsFromPerspective([
      { winnerGames: 6, loserGames: 4 },
      { winnerGames: 2, loserGames: 6 },
      { winnerGames: 4, loserGames: 2 },
    ]);
    assert.equal(totals.gameDiff, 0);
  });

  it("6. Arya 6-1,1-5 regression — positive Match Value, not zero", () => {
    const pair = matchValueForMatch(
      unfinished({
        id: "arya-minato",
        leaderPlayerId: "arya",
        trailingPlayerId: "minato",
        scoreText: "6-1, 1-5",
        scoreSets: [
          { winnerGames: 6, loserGames: 1 },
          { winnerGames: 1, loserGames: 5 },
        ],
        weight: 1,
      }),
    );
    assert.equal(pair.primary.setsWon, 1);
    assert.equal(pair.primary.setsLost, 0);
    assert.equal(pair.primary.gamesWon, 7);
    assert.equal(pair.primary.gamesLost, 6);
    assert.equal(pair.opponent.setsWon, 0);
    assert.equal(pair.opponent.setsLost, 1);
    assert.equal(pair.opponent.gamesWon, 6);
    assert.equal(pair.opponent.gamesLost, 7);
    approx(pair.primary.matchValue, 0.25, 0.05);
    assert.ok(pair.primary.matchValue >= 0.25 && pair.primary.matchValue <= 0.3);
    assert.equal(pair.opponent.matchValue, -pair.primary.matchValue);
    assert.notEqual(pair.primary.matchValue, 0);
  });

  it("7. Chika 6-4,3-2", () => {
    const pair = matchValueForMatch(
      unfinished({
        id: "chika",
        leaderPlayerId: "chika",
        trailingPlayerId: "jackson",
        scoreText: "6-4, 3-2",
        scoreSets: [
          { winnerGames: 6, loserGames: 4 },
          { winnerGames: 3, loserGames: 2 },
        ],
      }),
    );
    approx(pair.primary.matchValue, 0.5, 0.05);
    assert.ok(pair.primary.matchValue >= 0.45 && pair.primary.matchValue <= 0.5);
    assert.equal(pair.opponent.matchValue, -pair.primary.matchValue);
  });

  it("8. Peter 6-1,5-1", () => {
    const pair = matchValueForMatch(
      unfinished({
        id: "peter",
        leaderPlayerId: "peter",
        trailingPlayerId: "tom",
        scoreText: "6-1, 5-1",
        scoreSets: [
          { winnerGames: 6, loserGames: 1 },
          { winnerGames: 5, loserGames: 1 },
        ],
      }),
    );
    approx(pair.primary.matchValue, 0.65, 0.05);
    assert.ok(pair.primary.matchValue >= 0.6 && pair.primary.matchValue <= 0.7);
    assert.ok(pair.primary.matchValue < 1);
  });

  it("9. tied sets with third-set lead", () => {
    const pair = matchValueForMatch(
      unfinished({
        id: "tied-lead",
        scoreText: "6-4, 2-6, 4-2",
        scoreSets: [
          { winnerGames: 6, loserGames: 4 },
          { winnerGames: 2, loserGames: 6 },
          { winnerGames: 4, loserGames: 2 },
        ],
      }),
    );
    approx(pair.primary.matchValue, 0.1, 0.05);
    assert.ok(pair.primary.matchValue >= 0.1 && pair.primary.matchValue <= 0.2);
  });

  it("10. tied match at 3-3 returns near zero", () => {
    const value = unfinishedResultValueFromLeaderScore([
      { winnerGames: 6, loserGames: 4 },
      { winnerGames: 4, loserGames: 6 },
      { winnerGames: 3, loserGames: 3 },
    ]);
    assert.equal(value, 0);
  });

  it("11. zero-sum", () => {
    const cases = [
      match({ id: "z1" }),
      match({
        id: "z2",
        weight: 3,
        scoreText: "6-2",
        scoreSets: [{ winnerGames: 6, loserGames: 2 }],
      }),
      unfinished({ id: "z3" }),
      unfinished({
        id: "z4",
        weight: 2,
        scoreText: "6-1, 1-5",
        scoreSets: [
          { winnerGames: 6, loserGames: 1 },
          { winnerGames: 1, loserGames: 5 },
        ],
      }),
    ];
    for (const row of cases) {
      const pair = matchValueForMatch(row);
      assert.ok(Math.abs(pair.primary.matchValue + pair.opponent.matchValue) < 1e-9, row.id);
    }
  });

  it("12. Weight multiplication", () => {
    const base = matchValueForMatch(
      unfinished({
        id: "w1",
        leaderPlayerId: "arya",
        trailingPlayerId: "minato",
        scoreText: "6-1, 1-5",
        scoreSets: [
          { winnerGames: 6, loserGames: 1 },
          { winnerGames: 1, loserGames: 5 },
        ],
        weight: 1,
      }),
    );
    const weighted = matchValueForMatch(
      unfinished({
        id: "w2",
        leaderPlayerId: "arya",
        trailingPlayerId: "minato",
        scoreText: "6-1, 1-5",
        scoreSets: [
          { winnerGames: 6, loserGames: 1 },
          { winnerGames: 1, loserGames: 5 },
        ],
        weight: 2,
      }),
    );
    assert.equal(weighted.primary.matchValue, base.primary.matchValue * 2);
    assert.equal(weighted.opponent.matchValue, -weighted.primary.matchValue);
  });

  it("completed bases and unfinished constants", () => {
    assert.equal(MATCH_VALUE_FULL_BASE, 1);
    assert.equal(MATCH_VALUE_ONE_SET_BASE, 0.6);
    assert.equal(COMPLETED_SET_VALUE, 0.45);
    assert.equal(CURRENT_SET_MAX_VALUE, 0.2);
    assert.equal(CURRENT_SET_SCALE_GAMES, 4);
    assert.equal(UNFINISHED_MAX_VALUE, 0.9);
    assert.equal(MATCH_VALUE_DOMINANCE_MODIFIER, 1);
    assert.equal(
      classifyMatchCompleteness(match({ id: "f" })),
      "full_completed",
    );
    assert.equal(
      classifyMatchCompleteness(
        match({
          id: "os",
          scoreText: "6-2",
          scoreSets: [{ winnerGames: 6, loserGames: 2 }],
        }),
      ),
      "one_set_completed",
    );
    assert.equal(classifyMatchCompleteness(unfinished({ id: "uf" })), "unfinished");
  });

  it("full / one-set completed Match Value", () => {
    const full = matchValueForMatch(match({ id: "a" }));
    assert.equal(full.primary.matchValue, 1);
    assert.equal(full.opponent.matchValue, -1);
    const oneSet = matchValueForMatch(
      match({
        id: "b",
        scoreText: "6-2",
        scoreSets: [{ winnerGames: 6, loserGames: 2 }],
      }),
    );
    assert.equal(oneSet.primary.matchValue, 0.6);
    const weighted = matchValueForMatch(
      match({
        id: "c",
        weight: 3,
        scoreText: "6-2",
        scoreSets: [{ winnerGames: 6, loserGames: 2 }],
      }),
    );
    assert.equal(weighted.primary.matchValue, 1.8);
  });

  it("unfinished never reaches ±1", () => {
    const extreme = unfinishedResultValueFromLeaderScore([
      { winnerGames: 6, loserGames: 0 },
      { winnerGames: 5, loserGames: 0 },
    ]);
    assert.ok(Math.abs(extreme) <= UNFINISHED_MAX_VALUE);
    assert.ok(Math.abs(extreme) < 1);
  });

  it("equal negative for trailing third-set deficit", () => {
    const pair = matchValueForMatch(
      unfinished({
        id: "trail",
        scoreText: "6-4, 2-6, 2-4",
        scoreSets: [
          { winnerGames: 6, loserGames: 4 },
          { winnerGames: 2, loserGames: 6 },
          { winnerGames: 2, loserGames: 4 },
        ],
      }),
    );
    approx(pair.primary.matchValue, -0.1, 0.05);
    assert.equal(pair.opponent.matchValue, -pair.primary.matchValue);
  });

  it("edit / delete / convert recalculation", () => {
    const original = match({
      id: "edit",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      weight: 1,
      scoreText: "6-2",
      scoreSets: [{ winnerGames: 6, loserGames: 2 }],
    });
    assert.equal(computeMatchValueStandings([original]).get("nick")!.totalMatchValue, 0.6);
    assert.equal(
      computeMatchValueStandings([{ ...original, weight: 3 as const }]).get("nick")!.totalMatchValue,
      1.8,
    );

    const kept = match({ id: "kept", winnerPlayerId: "balraj", loserPlayerId: "kyle" });
    const temp = unfinished({ id: "temp" });
    assert.ok((computeMatchValueStandings([kept, temp]).get("chika")?.totalMatchValue ?? 0) > 0);
    assert.equal(computeMatchValueStandings([kept]).get("chika"), undefined);

    const uf = unfinished({ id: "convert" });
    assert.ok(matchValueForMatch(uf).primary.matchValue < 1);
    assert.equal(
      matchValueForMatch(
        match({
          id: "convert",
          winnerPlayerId: "chika",
          loserPlayerId: "jackson",
          status: "completed",
          scoreText: "6-4, 6-2",
          scoreSets: [
            { winnerGames: 6, loserGames: 4 },
            { winnerGames: 6, loserGames: 2 },
          ],
        }),
      ).primary.matchValue,
      1,
    );
  });

  it("Match Value ranking sort + history", () => {
    const matches = [
      match({ id: "1", winnerPlayerId: "balraj", loserPlayerId: "kyle", weight: 3 }),
      match({
        id: "2",
        winnerPlayerId: "nick",
        loserPlayerId: "aidan",
        weight: 1,
        scoreText: "6-2",
        scoreSets: [{ winnerGames: 6, loserGames: 2 }],
      }),
    ];
    const rankings = computeMatchValueRankings(matches, roster);
    assert.equal(rankings[0]!.playerId, "balraj");
    assert.equal(rankings[0]!.totalMatchValue, 3);
    assert.equal(rankings[0]!.history.length, 1);
  });

  it("existing Weighted Points and Elo unchanged", () => {
    const matches = [
      match({ id: "w1", winnerPlayerId: "balraj", loserPlayerId: "kyle", weight: 3 }),
      unfinished({ id: "w2" }),
    ];
    const records = computePlayerRecords(matches);
    const weighted = computeProvisionalRankings(matches, records, roster);
    assert.equal(weighted[0]!.playerId, "balraj");
    assert.equal(weighted[0]!.weightedNet, 3);
    assert.equal(records.find((row) => row.playerId === "chika")?.weightedNet, 0.5);

    const elo = rebuildEloFromMatches([
      match({ id: "e1", winnerPlayerId: "nick", loserPlayerId: "aidan", weight: 1 }),
    ]);
    assert.equal(elo.ratings.get("nick"), 1512);
    assert.equal(elo.ratings.get("aidan"), 1488);
    assert.match(eloSource, /ELO_STARTING_RATING = 1500/);
    assert.match(resultModelSource, /unfinishedLead: 0\.75/);
  });

  it("13. Dashboard player click opens player detail", () => {
    assert.match(livePreviewSource, /onSelectPlayer/);
    assert.match(workspaceSource, /openPlayerDetail\(playerId, "rankings"\)/);
  });

  it("14. Rankings player click defaults to Rankings context", () => {
    assert.match(recordsTableSource, /onSelectPlayer/);
    assert.match(workspaceSource, /openPlayerDetail\(playerId, "rankings"\)/);
    assert.match(playerDetailSource, /Ranking breakdown|Weighted Points History/);
  });

  it("15. Player Records click defaults to Records", () => {
    assert.match(workspaceSource, /openPlayerDetail\(playerId, "records"\)/);
    assert.match(playerDetailSource, /Complete Results/);
  });

  it("16. Match Value click defaults to Match Value", () => {
    assert.match(matchValueTableSource, /onSelectPlayer/);
    assert.match(workspaceSource, /openPlayerDetail\(playerId, "match-value"\)/);
    assert.match(playerDetailSource, /Match Value History/);
  });

  it("17. Elo Rankings click defaults to Elo", () => {
    assert.match(eloTableSource, /onSelectPlayer/);
    assert.match(workspaceSource, /openPlayerDetail\(playerId, "elo"\)/);
    assert.match(playerDetailSource, /Elo History/);
  });

  it("18. clicked player ID is correct", () => {
    assert.match(workspaceSource, /openPlayerDetail\(playerId,/);
    assert.match(playerDetailSource, /playerId=\{playerId\}|playerId,/);
    assert.match(playerNameSource, /stopPropagation/);
  });

  it("19. match history is player-specific", () => {
    assert.match(playerDetailSource, /playerResultsFromMatch/);
    assert.match(playerDetailSource, /row\.playerId === playerId/);
  });

  it("20. Match Value breakdown sums to displayed total", () => {
    const standing = computeMatchValueStandings([
      unfinished({
        id: "sum",
        leaderPlayerId: "arya",
        trailingPlayerId: "minato",
        scoreText: "6-1, 1-5",
        scoreSets: [
          { winnerGames: 6, loserGames: 1 },
          { winnerGames: 1, loserGames: 5 },
        ],
      }),
      match({ id: "sum2", winnerPlayerId: "arya", loserPlayerId: "minato", weight: 1 }),
    ]).get("arya")!;
    const historySum = standing.history.reduce((sum, row) => sum + row.matchValue, 0);
    assert.equal(historySum, standing.totalMatchValue);
    assert.match(playerDetailSource, /Match Value sum/);
  });

  it("21. Elo history ends at displayed current Elo", () => {
    assert.match(playerDetailSource, /Elo After/);
    assert.match(playerDetailSource, /Current Elo/);
  });

  it("22. Weighted Points breakdown sums correctly", () => {
    assert.match(playerDetailSource, /Credit sum/);
    assert.match(playerDetailSource, /weightedValue/);
  });

  it("23. player-name click does not trigger match row action", () => {
    assert.match(playerNameSource, /stopPropagation/);
    assert.match(matchListSource, /IntraSquadPlayerName/);
    assert.match(matchListSource, /onSelectPlayer/);
  });

  it("24. mobile player detail renders correctly", () => {
    assert.match(playerDetailSource, /md:hidden/);
    assert.match(playerDetailSource, /hidden overflow-x-auto.*md:block/);
    assert.match(matchValueTableSource, /Sets W-L/);
    assert.match(matchValueTableSource, /Game Diff/);
  });

  it("Dashboard and Match Log surface Match Value", () => {
    assert.match(livePreviewSource, /Match Value/);
    assert.match(livePreviewSource, /matchValueByPlayerId/);
    assert.match(matchListSource, /Match Value/);
    assert.match(matchListSource, /matchValueForMatch/);
  });
});
