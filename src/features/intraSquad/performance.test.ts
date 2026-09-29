import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  completionFactor,
  computePerformanceSummary,
  importanceForWeight,
} from "./performance";
import type { IntraSquadMatch, RosterPlayer } from "./types";

const roster: RosterPlayer[] = [
  { id: "arya", firstName: "Arya", lastName: "Kallambella" },
  { id: "aidan", firstName: "Aidan", lastName: "Borosko" },
  { id: "nick", firstName: "Nick", lastName: "Meyers" },
];

function match(overrides: Partial<IntraSquadMatch> & Pick<IntraSquadMatch, "id">): IntraSquadMatch {
  return {
    playedAt: "2026-09-03",
    status: "completed",
    winnerPlayerId: "arya",
    loserPlayerId: "aidan",
    leaderPlayerId: null,
    trailingPlayerId: null,
    scoreText: "6-3, 6-4",
    scoreSets: [
      { winnerGames: 6, loserGames: 3 },
      { winnerGames: 6, loserGames: 4 },
    ],
    weight: 1,
    sourceText: null,
    createdAt: "2026-09-03T12:00:00.000Z",
    updatedAt: "2026-09-03T12:00:00.000Z",
    ...overrides,
  };
}

describe("intra-squad performance", () => {
  it("uses diminishing match importance", () => {
    assert.equal(importanceForWeight(1), 1);
    assert.equal(importanceForWeight(2), 1.5);
    assert.equal(importanceForWeight(3), 2);
  });

  it("discounts one-set and unfinished evidence", () => {
    assert.equal(completionFactor(match({ id: "full" })), 1);
    assert.equal(
      completionFactor(match({
        id: "one",
        scoreText: "6-3",
        scoreSets: [{ winnerGames: 6, loserGames: 3 }],
      })),
      0.45,
    );
    const unfinished = completionFactor(match({
      id: "unfinished",
      status: "unfinished",
      winnerPlayerId: null,
      loserPlayerId: null,
      leaderPlayerId: "arya",
      trailingPlayerId: "aidan",
      scoreText: "6-4, 3-2",
      scoreSets: [
        { winnerGames: 6, loserGames: 4 },
        { winnerGames: 3, loserGames: 2 },
      ],
    }));
    assert.ok(unfinished > 0.2);
    assert.ok(unfinished < 1);
  });

  it("ranks the stronger result profile first and reports match equivalents once", () => {
    const summary = computePerformanceSummary([
      match({ id: "m1", winnerPlayerId: "arya", loserPlayerId: "aidan", weight: 3 }),
      match({
        id: "m2",
        playedAt: "2026-09-04",
        createdAt: "2026-09-04T12:00:00.000Z",
        updatedAt: "2026-09-04T12:00:00.000Z",
        winnerPlayerId: "arya",
        loserPlayerId: "nick",
        weight: 1,
      }),
      match({
        id: "m3",
        playedAt: "2026-09-05",
        createdAt: "2026-09-05T12:00:00.000Z",
        updatedAt: "2026-09-05T12:00:00.000Z",
        winnerPlayerId: "nick",
        loserPlayerId: "aidan",
        weight: 2,
      }),
    ], roster);

    assert.equal(summary.standings[0]?.playerId, "arya");
    assert.equal(summary.completedEquivalents, 4.5);
    assert.ok((summary.teamIps ?? 0) > 0);
    assert.equal(summary.standings.find((row) => row.playerId === "arya")?.completedEquivalents, 3);
  });
});
