import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import { classifyMatchScoreFromPlayerA, isCompletedTennisSet } from "./matchState";
import { interpretMatchEntry, TIED_UNFINISHED_HINT } from "./parseMatchText";
import { currentRosterPlayers } from "./roster";
import type { RosterPlayer } from "./types";

const quickEntrySource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/QuickMatchEntry.tsx"),
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
  person("minato", "Minato", "Koido"),
  person("nick", "Nick", "Meyers"),
  person("balraj", "Balraj", "Idnani"),
  person("kyle", "Kyle", "Patrick"),
  person("chika", "Chika", "Okurama"),
  person("jackson", "Jackson", "Smith"),
  person("peter", "Peter", "Smith"),
  person("tom", "Tom", "Jones"),
];

const roster: RosterPlayer[] = currentRosterPlayers(people);

describe("intra-squad versus / unfinished score inference", () => {
  it("button disabled only when input empty or busy", () => {
    assert.match(quickEntrySource, /!hasText \|\| busyPhase !== null/);
    assert.doesNotMatch(quickEntrySource, /preview && \(!preview\.needsConfirmation/);
    assert.match(quickEntrySource, /setSubmitError\(null\)/);
  });

  it("parse preview is not required before submit", () => {
    assert.match(quickEntrySource, /setBusyPhase\("understanding"\)/);
    assert.match(quickEntrySource, /interpretMatchEntry\(trimmed, roster/);
    assert.match(quickEntrySource, /parseViaApi/);
    assert.doesNotMatch(quickEntrySource, /if \(!preview\) \{\s*setSubmitError\(PARSE_ERROR_HINT\)/);
  });

  it("stale error clears on text change and does not disable button", () => {
    assert.match(quickEntrySource, /onChange=\{\(event\) => \{\s*setText\(event\.target\.value\);\s*setEditing\(false\);\s*setSubmitError\(null\);/);
    assert.match(quickEntrySource, /buttonDisabled = !hasText \|\| busyPhase !== null/);
  });

  it("Arya 61, 15 v. Minato → unfinished Arya leading 6-1, 1-5", () => {
    const interpreted = interpretMatchEntry("Arya 61, 15 v. Minato", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "unfinished");
    assert.equal(interpreted.leader.id, "arya");
    assert.equal(interpreted.trailing.id, "minato");
    assert.equal(interpreted.scoreText, "6-1, 1-5");
  });

  it("Arya 6-1, 1-5 vs Minato → unfinished with match leader Arya", () => {
    const interpreted = interpretMatchEntry("Arya 6-1, 1-5 vs Minato", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "unfinished");
    assert.equal(interpreted.leader.id, "arya");
    assert.equal(interpreted.trailing.id, "minato");
    assert.equal(interpreted.scoreText, "6-1, 1-5");
  });

  it("Arya vs Minato 61 15 → unfinished", () => {
    const interpreted = interpretMatchEntry("Arya vs Minato 61 15", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "unfinished");
    assert.equal(interpreted.leader.id, "arya");
    assert.equal(interpreted.trailing.id, "minato");
    assert.equal(interpreted.scoreText, "6-1, 1-5");
  });

  it("Arya 61 15 against Minato → unfinished", () => {
    const interpreted = interpretMatchEntry("Arya 61 15 against Minato", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "unfinished");
    assert.equal(interpreted.leader.id, "arya");
    assert.equal(interpreted.scoreText, "6-1, 1-5");
  });

  it("completed-set count determines match leader over current-set score", () => {
    // Arya won set 1; Minato ahead 5-1 in set 2 → Arya still match leader.
    const classified = classifyMatchScoreFromPlayerA([
      { winnerGames: 6, loserGames: 1 },
      { winnerGames: 1, loserGames: 5 },
    ]);
    assert.equal(classified.kind, "unfinished");
    assert.equal(classified.playerASets, 1);
    assert.equal(classified.playerBSets, 0);
    assert.equal(classified.leader, "a");
  });

  it("current-set lead determines leader when completed sets are tied", () => {
    const aLeads = classifyMatchScoreFromPlayerA([
      { winnerGames: 6, loserGames: 4 },
      { winnerGames: 2, loserGames: 6 },
      { winnerGames: 4, loserGames: 2 },
    ]);
    assert.equal(aLeads.kind, "unfinished");
    assert.equal(aLeads.leader, "a");

    const bLeads = classifyMatchScoreFromPlayerA([
      { winnerGames: 6, loserGames: 4 },
      { winnerGames: 2, loserGames: 6 },
      { winnerGames: 2, loserGames: 4 },
    ]);
    assert.equal(bLeads.kind, "unfinished");
    assert.equal(bLeads.leader, "b");

    const interpreted = interpretMatchEntry("Arya 6-4, 2-6, 2-4 vs Minato", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "unfinished");
    assert.equal(interpreted.leader.id, "minato");
    assert.equal(interpreted.trailing.id, "arya");
    assert.equal(interpreted.scoreText, "4-6, 6-2, 4-2");
  });

  it("genuinely tied unfinished state does not guess a leader", () => {
    const tied = classifyMatchScoreFromPlayerA([
      { winnerGames: 6, loserGames: 4 },
      { winnerGames: 2, loserGames: 6 },
    ]);
    assert.equal(tied.kind, "tied_unfinished");
    assert.equal(tied.leader, "tied");

    const interpreted = interpretMatchEntry("Arya 6-4, 2-6 vs Minato", roster);
    assert.ok("error" in interpreted);
    assert.equal(interpreted.error, TIED_UNFINISHED_HINT);
  });

  it("completed versus score still resolves a winner", () => {
    const interpreted = interpretMatchEntry("Arya 61, 61 v. Minato", roster);
    assert.ok("ok" in interpreted);
    assert.equal(interpreted.status, "completed");
    assert.equal(interpreted.winner.id, "arya");
    assert.equal(interpreted.loser.id, "minato");
    assert.equal(interpreted.scoreText, "6-1, 6-1");
  });

  it("existing completed phrases still work", () => {
    for (const raw of [
      "Balraj def. Kyle 61, 61",
      "Nick beat Minato 36 60 62",
      "Kyle lost to Balraj 1-6, 1-6",
      "Nick came back to beat Minato 3-6, 6-0, 6-2",
    ]) {
      const interpreted = interpretMatchEntry(raw, roster);
      assert.ok("ok" in interpreted, raw);
      assert.equal(interpreted.status, "completed", raw);
    }
  });

  it("existing explicit unfinished phrases still work", () => {
    for (const raw of [
      "Chika was leading Jackson 64, 32",
      "Peter was leading Tom 6-1, 5-1",
    ]) {
      const interpreted = interpretMatchEntry(raw, roster);
      assert.ok("ok" in interpreted, raw);
      assert.equal(interpreted.status, "unfinished", raw);
    }
  });

  it("isCompletedTennisSet recognizes standard set endings", () => {
    assert.equal(isCompletedTennisSet({ winnerGames: 6, loserGames: 1 }), true);
    assert.equal(isCompletedTennisSet({ winnerGames: 7, loserGames: 6 }), true);
    assert.equal(isCompletedTennisSet({ winnerGames: 7, loserGames: 5 }), true);
    assert.equal(isCompletedTennisSet({ winnerGames: 1, loserGames: 5 }), false);
    assert.equal(isCompletedTennisSet({ winnerGames: 5, loserGames: 5 }), false);
    assert.equal(isCompletedTennisSet({ winnerGames: 6, loserGames: 5 }), false);
  });
});
