import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import {
  ELO_K_BY_WEIGHT,
  ELO_STARTING_RATING,
  compareEloRankings,
  computeEloRankings,
  expectedScore,
  formatEloChangeFromStart,
  formatEloRating,
  formatEloResultLabel,
  kFactorForWeight,
  rebuildEloFromMatches,
  sortMatchesChronologically,
} from "./elo";
import { computeProvisionalRankings } from "./rankings";
import { computePlayerRecords } from "./records";
import { currentRosterPlayers } from "./roster";
import type { IntraSquadMatch, RosterPlayer } from "./types";

const livePreviewSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/LiveRankingsPreview.tsx"),
  "utf8",
);
const workspaceSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadWorkspace.tsx"),
  "utf8",
);
const howSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/HowRankingsWorkCard.tsx"),
  "utf8",
);
const eloTableSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/EloRankingsTable.tsx"),
  "utf8",
);
const detailSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadPlayerDetail.tsx"),
  "utf8",
);
const trendSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/EloRatingTrendCard.tsx"),
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
  person("arya", "Arya", "Ganapathy"),
  person("aidan", "Aidan", "Borosko"),
  person("nick", "Nick", "Meyers"),
  person("minato", "Minato", "Koido"),
  person("balraj", "Balraj", "Idnani"),
  person("kyle", "Kyle", "Patrick"),
  person("chika", "Chika", "Okurama"),
  person("jackson", "Jackson", "Smith"),
  person("zero", "Zero", "Matches"),
];

const roster: RosterPlayer[] = currentRosterPlayers(people);

function match(overrides: Partial<IntraSquadMatch> & Pick<IntraSquadMatch, "id">): IntraSquadMatch {
  return {
    playedAt: "2026-09-03",
    status: "completed",
    winnerPlayerId: "nick",
    loserPlayerId: "minato",
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

describe("intra-squad Elo engine", () => {
  it("1. all players start at 1500", () => {
    assert.equal(ELO_STARTING_RATING, 1500);
    const rebuild = rebuildEloFromMatches([]);
    assert.equal(rebuild.ratings.size, 0);
    const rankings = computeEloRankings([], [], roster);
    for (const row of rankings) {
      assert.equal(row.rating, 1500);
      assert.equal(row.matchesPlayed, 0);
    }
  });

  it("2. equal-rating weight-1 win gives +12/-12", () => {
    const rebuild = rebuildEloFromMatches([
      match({ id: "m1", winnerPlayerId: "nick", loserPlayerId: "minato", weight: 1 }),
    ]);
    assert.equal(rebuild.ratings.get("nick"), 1512);
    assert.equal(rebuild.ratings.get("minato"), 1488);
    assert.equal(expectedScore(1500, 1500), 0.5);
    assert.equal(kFactorForWeight(1), 24);
  });

  it("3. equal-rating unfinished gives +6/-6", () => {
    const rebuild = rebuildEloFromMatches([unfinished({ id: "uf1", weight: 1 })]);
    assert.equal(rebuild.ratings.get("chika"), 1506);
    assert.equal(rebuild.ratings.get("jackson"), 1494);
  });

  it("4. weight 2 uses K=36", () => {
    assert.equal(ELO_K_BY_WEIGHT[2], 36);
    assert.equal(kFactorForWeight(2), 36);
    const rebuild = rebuildEloFromMatches([
      match({ id: "w2", winnerPlayerId: "nick", loserPlayerId: "minato", weight: 2 }),
    ]);
    assert.equal(rebuild.ratings.get("nick"), 1500 + 36 * 0.5);
    assert.equal(rebuild.ratings.get("minato"), 1500 - 36 * 0.5);
  });

  it("5. weight 3 uses K=48", () => {
    assert.equal(kFactorForWeight(3), 48);
    const rebuild = rebuildEloFromMatches([
      match({ id: "w3", winnerPlayerId: "nick", loserPlayerId: "minato", weight: 3 }),
    ]);
    assert.equal(rebuild.ratings.get("nick"), 1524);
    assert.equal(rebuild.ratings.get("minato"), 1476);
  });

  it("6. upset creates larger rating movement", () => {
    const prior = [
      match({
        id: "seed-high",
        winnerPlayerId: "nick",
        loserPlayerId: "arya",
        weight: 3,
        playedAt: "2026-09-01",
        createdAt: "2026-09-01T10:00:00.000Z",
      }),
      match({
        id: "seed-high-2",
        winnerPlayerId: "nick",
        loserPlayerId: "aidan",
        weight: 3,
        playedAt: "2026-09-01",
        createdAt: "2026-09-01T11:00:00.000Z",
      }),
    ];
    const beforeUpset = rebuildEloFromMatches(prior);
    const nickBefore = beforeUpset.ratings.get("nick")!;
    const minatoBefore = beforeUpset.ratings.get("minato") ?? 1500;
    assert.ok(nickBefore > minatoBefore);

    const afterUpset = rebuildEloFromMatches([
      ...prior,
      match({
        id: "upset",
        winnerPlayerId: "minato",
        loserPlayerId: "nick",
        weight: 1,
        playedAt: "2026-09-03",
      }),
    ]);
    const upsetGain = afterUpset.ratings.get("minato")! - minatoBefore;

    const equalWin = rebuildEloFromMatches([
      match({ id: "eq", winnerPlayerId: "balraj", loserPlayerId: "kyle", weight: 1 }),
    ]);
    const equalGain = equalWin.ratings.get("balraj")! - 1500;
    assert.ok(upsetGain > equalGain);
  });

  it("7. favorite win creates smaller movement", () => {
    const favoriteBuilt = rebuildEloFromMatches([
      match({
        id: "fav1",
        winnerPlayerId: "nick",
        loserPlayerId: "arya",
        weight: 3,
        playedAt: "2026-09-01",
      }),
      match({
        id: "fav2",
        winnerPlayerId: "nick",
        loserPlayerId: "aidan",
        weight: 3,
        playedAt: "2026-09-02",
      }),
    ]);
    const nick = favoriteBuilt.ratings.get("nick")!;
    const minato = 1500;
    assert.ok(nick > minato);

    const afterFavoriteWin = rebuildEloFromMatches([
      match({
        id: "fav1",
        winnerPlayerId: "nick",
        loserPlayerId: "arya",
        weight: 3,
        playedAt: "2026-09-01",
      }),
      match({
        id: "fav2",
        winnerPlayerId: "nick",
        loserPlayerId: "aidan",
        weight: 3,
        playedAt: "2026-09-02",
      }),
      match({
        id: "fav-win",
        winnerPlayerId: "nick",
        loserPlayerId: "minato",
        weight: 1,
        playedAt: "2026-09-03",
      }),
    ]);
    const favoriteGain = afterFavoriteWin.ratings.get("nick")! - nick;
    assert.ok(favoriteGain < 12);
  });

  it("8. zero-sum property", () => {
    for (const weight of [1, 2, 3] as const) {
      const completed = rebuildEloFromMatches([
        match({ id: `z${weight}`, winnerPlayerId: "nick", loserPlayerId: "minato", weight }),
      ]);
      const sum =
        (completed.ratings.get("nick")! - 1500) + (completed.ratings.get("minato")! - 1500);
      assert.ok(Math.abs(sum) < 1e-9);

      const uf = rebuildEloFromMatches([unfinished({ id: `zu${weight}`, weight })]);
      const ufSum =
        (uf.ratings.get("chika")! - 1500) + (uf.ratings.get("jackson")! - 1500);
      assert.ok(Math.abs(ufSum) < 1e-9);
    }
  });

  it("9. chronological processing", () => {
    const matches = [
      match({
        id: "later",
        winnerPlayerId: "nick",
        loserPlayerId: "minato",
        playedAt: "2026-09-05",
        createdAt: "2026-09-05T12:00:00.000Z",
      }),
      match({
        id: "earlier",
        winnerPlayerId: "minato",
        loserPlayerId: "nick",
        playedAt: "2026-09-01",
        createdAt: "2026-09-01T12:00:00.000Z",
      }),
    ];
    const ordered = sortMatchesChronologically(matches);
    assert.deepEqual(
      ordered.map((row) => row.id),
      ["earlier", "later"],
    );
    const rebuild = rebuildEloFromMatches(matches);
    const nickHistory = rebuild.standings.get("nick")!.history;
    assert.equal(nickHistory[0]!.matchId, "earlier");
    assert.equal(nickHistory[1]!.matchId, "later");
  });

  it("10. same-date deterministic order uses created_at then id", () => {
    const matches = [
      match({
        id: "b",
        winnerPlayerId: "nick",
        loserPlayerId: "minato",
        playedAt: "2026-09-03",
        createdAt: "2026-09-03T15:00:00.000Z",
      }),
      match({
        id: "a",
        winnerPlayerId: "arya",
        loserPlayerId: "aidan",
        playedAt: "2026-09-03",
        createdAt: "2026-09-03T10:00:00.000Z",
      }),
      match({
        id: "c",
        winnerPlayerId: "balraj",
        loserPlayerId: "kyle",
        playedAt: "2026-09-03",
        createdAt: "2026-09-03T15:00:00.000Z",
      }),
    ];
    assert.deepEqual(
      sortMatchesChronologically(matches).map((row) => row.id),
      ["a", "b", "c"],
    );
  });

  it("11. delete historical match rebuilds later Elo", () => {
    const first = match({
      id: "first",
      winnerPlayerId: "nick",
      loserPlayerId: "minato",
      playedAt: "2026-09-01",
      createdAt: "2026-09-01T12:00:00.000Z",
    });
    const second = match({
      id: "second",
      winnerPlayerId: "nick",
      loserPlayerId: "arya",
      playedAt: "2026-09-03",
      createdAt: "2026-09-03T12:00:00.000Z",
    });
    const withBoth = rebuildEloFromMatches([first, second]);
    const afterDelete = rebuildEloFromMatches([second]);
    assert.notEqual(withBoth.ratings.get("nick"), afterDelete.ratings.get("nick"));
    assert.equal(afterDelete.ratings.get("nick"), 1512);
    assert.equal(afterDelete.standings.get("minato"), undefined);
  });

  it("12. edit historical weight rebuilds later Elo", () => {
    const light = match({
      id: "w",
      winnerPlayerId: "nick",
      loserPlayerId: "minato",
      weight: 1,
      playedAt: "2026-09-01",
    });
    const follow = match({
      id: "f",
      winnerPlayerId: "nick",
      loserPlayerId: "arya",
      weight: 1,
      playedAt: "2026-09-03",
    });
    const before = rebuildEloFromMatches([light, follow]);
    const after = rebuildEloFromMatches([{ ...light, weight: 3 }, follow]);
    assert.ok(after.ratings.get("nick")! > before.ratings.get("nick")!);
  });

  it("13. unfinished → completed rebuild", () => {
    const uf = unfinished({ id: "convert", weight: 1 });
    const asUnfinished = rebuildEloFromMatches([uf]);
    assert.equal(asUnfinished.ratings.get("chika"), 1506);
    assert.equal(asUnfinished.ratings.get("jackson"), 1494);

    const completed = match({
      id: "convert",
      status: "completed",
      winnerPlayerId: "chika",
      loserPlayerId: "jackson",
      leaderPlayerId: null,
      trailingPlayerId: null,
      weight: 1,
    });
    const asCompleted = rebuildEloFromMatches([completed]);
    assert.equal(asCompleted.ratings.get("chika"), 1512);
    assert.equal(asCompleted.ratings.get("jackson"), 1488);
  });

  it("14. current Elo ranking sort", () => {
    const matches = [
      match({ id: "1", winnerPlayerId: "nick", loserPlayerId: "minato", weight: 1 }),
      unfinished({ id: "2", leaderPlayerId: "chika", trailingPlayerId: "jackson", weight: 1 }),
    ];
    const records = computePlayerRecords(matches);
    const rankings = computeEloRankings(matches, records, roster);
    assert.equal(rankings[0]!.playerId, "nick");
    assert.ok(rankings[0]!.rating >= rankings[1]!.rating);
    assert.equal(formatEloRating(rankings[0]!.rating), "1512");
  });

  it("15. zero-match player remains 1500 and sorts below matched 1500 ties", () => {
    const rankingsEmpty = computeEloRankings([], [], roster);
    const zero = rankingsEmpty.find((row) => row.playerId === "zero")!;
    assert.equal(zero.rating, 1500);
    assert.equal(zero.matchesPlayed, 0);
    assert.equal(formatEloChangeFromStart(zero.changeFromStart, zero.matchesPlayed), "—");

    assert.ok(
      compareEloRankings(
        { rating: 1500, matchesPlayed: 2, playerId: "nick" },
        { rating: 1500, matchesPlayed: 0, playerId: "zero" },
        roster,
      ) < 0,
    );

    const matches = [
      match({ id: "a", winnerPlayerId: "nick", loserPlayerId: "minato", weight: 1 }),
    ];
    const records = computePlayerRecords(matches);
    const rankings = computeEloRankings(matches, records, roster);
    const nick = rankings.find((row) => row.playerId === "nick")!;
    const zeroAfter = rankings.find((row) => row.playerId === "zero")!;
    assert.equal(nick.rating, 1512);
    assert.equal(zeroAfter.rating, 1500);
    assert.ok(nick.rank < zeroAfter.rank);
  });

  it("16. Dashboard Top 5 displays real Elo", () => {
    assert.match(livePreviewSource, /formatEloRating/);
    assert.match(livePreviewSource, /eloByPlayerId/);
    assert.doesNotMatch(livePreviewSource, /EMPTY_VALUE/);
    assert.match(workspaceSource, /eloRebuild\.ratings/);
  });

  it("17. player Elo history has before/change/after", () => {
    const rebuild = rebuildEloFromMatches([
      match({ id: "h1", winnerPlayerId: "nick", loserPlayerId: "minato", weight: 1 }),
    ]);
    const nick = rebuild.standings.get("nick")!;
    assert.equal(nick.history.length, 1);
    assert.equal(nick.history[0]!.ratingBefore, 1500);
    assert.equal(nick.history[0]!.ratingChange, 12);
    assert.equal(nick.history[0]!.ratingAfter, 1512);
    assert.equal(nick.history[0]!.expectedResult, 0.5);
    assert.equal(nick.history[0]!.actualResult, 1);
    assert.equal(nick.history[0]!.kFactor, 24);
    assert.match(detailSource, /Elo Before/);
    assert.match(detailSource, /Elo After/);
    assert.match(eloTableSource, /onSelectPlayer/);
  });

  it("18. completed result labels correct", () => {
    assert.equal(formatEloResultLabel("W"), "Win");
    assert.equal(formatEloResultLabel("L"), "Loss");
  });

  it("19. unfinished labels correct", () => {
    assert.equal(formatEloResultLabel("leading"), "UF Lead");
    assert.equal(formatEloResultLabel("trailing"), "UF Trail");
  });

  it("20. existing Weighted Points ranking remains unchanged", () => {
    const matches = [
      match({ id: "w1", winnerPlayerId: "balraj", loserPlayerId: "kyle", weight: 3 }),
      unfinished({ id: "w2", leaderPlayerId: "chika", trailingPlayerId: "jackson", weight: 1 }),
      match({ id: "w3", winnerPlayerId: "nick", loserPlayerId: "minato", weight: 1 }),
    ];
    const records = computePlayerRecords(matches);
    const weighted = computeProvisionalRankings(matches, records, roster);
    assert.equal(weighted[0]!.playerId, "balraj");
    assert.equal(weighted[0]!.weightedNet, 3);
    assert.match(workspaceSource, /rebuildIntraSquadDerivedState/);
    assert.match(workspaceSource, /applyCanonicalMatchAndRebuild/);
    assert.match(howSource, /Weighted Points/);
    assert.match(howSource, /Elo:/);
    assert.match(trendSource, /Elo Rating Trend/);
    assert.match(trendSource, /rebuild|baseline 1500|Top 5/i);
  });
});
