import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import { ELO_STARTING_RATING } from "./elo";
import { inputToRow, normalizeIntraSquadInput } from "./mapping";
import {
  assertCanonicalMatchCoherent,
  deriveCanonicalMatchResult,
  resolveEditedMatchStatus,
  scoreImpliesMatchStatus,
} from "./normalizeEditedMatch";
import { applyCanonicalMatchAndRebuild, rebuildIntraSquadDerivedState } from "./rebuildDerivedState";
import { currentRosterPlayers } from "./roster";
import type { IntraSquadMatch, RosterPlayer } from "./types";

const formSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadMatchForm.tsx"),
  "utf8",
);
const mappingSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/mapping.ts"),
  "utf8",
);
const actionsSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/actions.ts"),
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

const roster: RosterPlayer[] = currentRosterPlayers([
  person("nick", "Nick", "Meyers"),
  person("aidan", "Aidan", "Borosko"),
  person("chika", "Chika", "Okurama"),
  person("jackson", "Jackson", "Smith"),
]);

function match(overrides: Partial<IntraSquadMatch> & Pick<IntraSquadMatch, "id">): IntraSquadMatch {
  return {
    playedAt: "2026-09-03",
    status: "completed",
    winnerPlayerId: "nick",
    loserPlayerId: "aidan",
    leaderPlayerId: null,
    trailingPlayerId: null,
    scoreText: "6-1",
    scoreSets: [{ winnerGames: 6, loserGames: 1 }],
    weight: 1,
    sourceText: null,
    createdAt: "2026-09-03T12:00:00.000Z",
    updatedAt: "2026-09-03T12:00:00.000Z",
    ...overrides,
  };
}

describe("Intra Squad score edit reclassification", () => {
  it("BUG repro: pre-fix normalize would keep completed + winner for score 5-3", () => {
    // Documents the old failure mode: trusting statusHint without score reclassification.
    // After the fix, the same payload must become unfinished.
    const normalized = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      status: "completed",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      scoreText: "5-3",
      weight: 1,
    });
    assert.ok(!("error" in normalized));
    assert.equal(normalized.input.status, "unfinished");
    assert.equal(normalized.input.winnerPlayerId, null);
    assert.equal(normalized.input.loserPlayerId, null);
    assert.equal(normalized.input.leaderPlayerId, "nick");
    assert.equal(normalized.input.trailingPlayerId, "aidan");
    assert.equal(normalized.input.scoreText, "5-3");
    assert.deepEqual(normalized.input.scoreSets, [{ winnerGames: 5, loserGames: 3 }]);

    const row = inputToRow(normalized.input);
    assert.equal(row.status, "unfinished");
    assert.equal(row.winner_player_id, null);
    assert.equal(row.loser_player_id, null);
    assert.equal(row.leader_player_id, "nick");
    assert.equal(row.trailing_player_id, "aidan");
  });

  it("EXACT: Nick def. Aidan 6-1 → edit score 5-3 rebuilds all derived metrics", () => {
    const original = match({ id: "na" });
    const before = rebuildIntraSquadDerivedState([original], roster);
    assert.equal(before.records.find((r) => r.playerId === "nick")?.wins, 1);
    assert.equal(before.records.find((r) => r.playerId === "aidan")?.losses, 1);
    assert.equal(before.records.find((r) => r.playerId === "nick")?.weightedNet, 1);
    assert.equal(before.elo.standings.get("nick")?.history[0]?.actualResult, 1);
    assert.equal(before.matchValueStandings.get("nick")?.totalMatchValue, 0.6);
    assert.equal(before.matchValueStandings.get("nick")?.setsWon, 1);
    assert.equal(before.matchValueStandings.get("nick")?.gamesWon, 6);

    const savedInput = normalizeIntraSquadInput({
      playedAt: original.playedAt,
      status: "completed", // stale form status — must be overridden by score
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      scoreText: "5-3",
      weight: 1,
      sourceText: original.sourceText,
    });
    assert.ok(!("error" in savedInput));
    assert.equal(savedInput.input.status, "unfinished");

    const saved: IntraSquadMatch = {
      ...original,
      ...savedInput.input,
      updatedAt: "2026-09-03T13:00:00.000Z",
    };
    const { derived: after } = applyCanonicalMatchAndRebuild([original], saved, roster);

    assert.equal(after.records.find((r) => r.playerId === "nick")?.wins, 0);
    assert.equal(after.records.find((r) => r.playerId === "aidan")?.losses, 0);
    assert.equal(after.records.find((r) => r.playerId === "nick")?.unfinishedLeading, 1);
    assert.equal(after.records.find((r) => r.playerId === "aidan")?.unfinishedTrailing, 1);
    assert.equal(after.records.find((r) => r.playerId === "nick")?.weightedNet, 0.5);
    assert.equal(after.records.find((r) => r.playerId === "aidan")?.weightedNet, -0.5);
    assert.equal(after.elo.standings.get("nick")?.history[0]?.actualResult, 0.75);
    assert.equal(after.elo.standings.get("aidan")?.history[0]?.actualResult, 0.25);
    assert.ok((after.matchValueStandings.get("nick")?.totalMatchValue ?? 0) > 0);
    assert.ok((after.matchValueStandings.get("nick")?.totalMatchValue ?? 0) < 0.6);
    assert.equal(after.matchValueStandings.get("nick")?.setsWon, 0);
    assert.equal(after.matchValueStandings.get("nick")?.setsLost, 0);
    assert.equal(after.matchValueStandings.get("nick")?.gamesWon, 5);
    assert.equal(after.matchValueStandings.get("aidan")?.gamesWon, 3);
    assert.ok(after.elo.ratings.get("nick")! > ELO_STARTING_RATING);
    assert.ok(after.elo.ratings.get("nick")! < before.elo.ratings.get("nick")!);

    // Refresh persistence: same canonical list → same derived state
    const refreshed = rebuildIntraSquadDerivedState([saved], roster);
    assert.equal(refreshed.records.find((r) => r.playerId === "nick")?.unfinishedLeading, 1);
    assert.equal(refreshed.records.find((r) => r.playerId === "nick")?.wins, 0);
  });

  it("1. 6-1 completed → 5-3 unfinished", () => {
    const result = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "5-3",
      weight: 1,
      sourceText: null,
      statusHint: "completed",
    });
    assert.ok(!("error" in result));
    assert.equal(result.input.status, "unfinished");
    assert.equal(result.input.leaderPlayerId, "nick");
  });

  it("2. 5-3 unfinished → 6-3 completed", () => {
    // Form sync prefers one-set completed while typing; save uses that hint.
    assert.equal(scoreImpliesMatchStatus([{ winnerGames: 6, loserGames: 3 }]), "ambiguous");
    const result = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "6-3",
      weight: 1,
      sourceText: null,
      statusHint: "completed",
    });
    assert.ok(!("error" in result));
    assert.equal(result.input.status, "completed");
    assert.equal(result.input.winnerPlayerId, "nick");
    assert.equal(result.input.loserPlayerId, "aidan");
    assert.equal(result.input.leaderPlayerId, null);
    assert.equal(result.input.scoreText, "6-3");

    // Explicit unfinished + single completed set remains unfinished (stopped after set 1).
    const stopped = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "6-3",
      weight: 1,
      sourceText: null,
      statusHint: "unfinished",
    });
    assert.ok(!("error" in stopped));
    assert.equal(stopped.input.status, "unfinished");
    assert.equal(stopped.input.leaderPlayerId, "nick");
  });

  it("3. 6-1 completed → 3-6 flips winner when second player took the set", () => {
    const result = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "3-6",
      weight: 1,
      sourceText: null,
      statusHint: "completed",
    });
    assert.ok(!("error" in result));
    assert.equal(result.input.status, "completed");
    assert.equal(result.input.winnerPlayerId, "aidan");
    assert.equal(result.input.loserPlayerId, "nick");
    assert.equal(result.input.scoreText, "6-3");
  });

  it("4. 6-1,6-2 → 6-1,3-2 unfinished", () => {
    const result = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "6-1, 3-2",
      weight: 1,
      sourceText: null,
      statusHint: "completed",
    });
    assert.ok(!("error" in result));
    assert.equal(result.input.status, "unfinished");
    assert.equal(result.input.leaderPlayerId, "nick");
    assert.equal(result.input.winnerPlayerId, null);
  });

  it("5. 6-1,3-2 → 6-1,6-2 completed", () => {
    const result = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "6-1, 6-2",
      weight: 1,
      sourceText: null,
      statusHint: "unfinished",
    });
    assert.ok(!("error" in result));
    assert.equal(result.input.status, "completed");
    assert.equal(result.input.winnerPlayerId, "nick");
    assert.equal(result.input.leaderPlayerId, null);
  });

  it("6. 6-1,1-5 unfinished leader inference (set lead beats current set)", () => {
    const result = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "6-1, 1-5",
      weight: 1,
      sourceText: null,
      statusHint: "unfinished",
    });
    assert.ok(!("error" in result));
    assert.equal(result.input.status, "unfinished");
    assert.equal(result.input.leaderPlayerId, "nick");
    assert.equal(result.input.trailingPlayerId, "aidan");
    assert.equal(result.input.scoreText, "6-1, 1-5");
  });

  it("7. tied unfinished score is rejected", () => {
    const result = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "3-3",
      weight: 1,
      sourceText: null,
      statusHint: "unfinished",
    });
    assert.ok("error" in result);
    assert.match(result.error, /tied/i);
  });

  it("8. status field synchronizes with score implication", () => {
    assert.equal(scoreImpliesMatchStatus([{ winnerGames: 5, loserGames: 3 }]), "unfinished");
    assert.equal(scoreImpliesMatchStatus([{ winnerGames: 6, loserGames: 1 }]), "ambiguous");
    assert.equal(
      scoreImpliesMatchStatus([
        { winnerGames: 6, loserGames: 1 },
        { winnerGames: 6, loserGames: 2 },
      ]),
      "completed",
    );
    assert.equal(
      resolveEditedMatchStatus([{ winnerGames: 5, loserGames: 3 }], "completed"),
      "unfinished",
    );
    assert.equal(
      resolveEditedMatchStatus([{ winnerGames: 6, loserGames: 1 }], "completed"),
      "completed",
    );
    assert.equal(
      resolveEditedMatchStatus([{ winnerGames: 6, loserGames: 1 }], "unfinished"),
      "unfinished",
    );
    assert.match(formSource, /syncStatusFromScore/);
    assert.match(formSource, /onChange=\{/);
  });

  it("9. contradictory completed + unfinished score rejected / repaired server-side", () => {
    const repaired = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      status: "completed",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      scoreText: "5-3",
      weight: 1,
    });
    assert.ok(!("error" in repaired));
    assert.equal(repaired.input.status, "unfinished");

    const incoherent = assertCanonicalMatchCoherent({
      playedAt: "2026-09-03",
      status: "completed",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      leaderPlayerId: null,
      trailingPlayerId: null,
      scoreText: "5-3",
      scoreSets: [{ winnerGames: 5, loserGames: 3 }],
      weight: 1,
      sourceText: null,
    });
    assert.ok("error" in incoherent);

    const unfinishedWithWinner = assertCanonicalMatchCoherent({
      playedAt: "2026-09-03",
      status: "unfinished",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      leaderPlayerId: "nick",
      trailingPlayerId: "aidan",
      scoreText: "5-3",
      scoreSets: [{ winnerGames: 5, loserGames: 3 }],
      weight: 1,
      sourceText: null,
    });
    assert.ok("error" in unfinishedWithWinner);

    assert.match(mappingSource, /deriveCanonicalMatchResult/);
    assert.match(mappingSource, /assertCanonicalMatchCoherent/);
    assert.match(actionsSource, /normalizeIntraSquadInput/);
  });

  it("10. rebuild still runs after normalized save (applyCanonicalMatchAndRebuild)", () => {
    const original = match({ id: "rebuild" });
    const normalized = normalizeIntraSquadInput({
      playedAt: "2026-09-03",
      status: "completed",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      scoreText: "5-3",
      weight: 1,
    });
    assert.ok(!("error" in normalized));
    const saved: IntraSquadMatch = { ...original, ...normalized.input };
    const { derived } = applyCanonicalMatchAndRebuild([original], saved, roster);
    assert.equal(derived.records.find((r) => r.playerId === "nick")?.unfinishedLeading, 1);
    assert.equal(derived.dashboard.totalMatches, 1);
  });

  it("6-4, 2-6, 4-2 unfinished; 6-4, 2-6, 6-4 completed", () => {
    const uf = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "6-4, 2-6, 4-2",
      weight: 1,
      sourceText: null,
      statusHint: "completed",
    });
    assert.ok(!("error" in uf));
    assert.equal(uf.input.status, "unfinished");
    assert.equal(uf.input.leaderPlayerId, "nick");

    const done = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "6-4, 2-6, 6-4",
      weight: 1,
      sourceText: null,
      statusHint: "unfinished",
    });
    assert.ok(!("error" in done));
    assert.equal(done.input.status, "completed");
    assert.equal(done.input.winnerPlayerId, "nick");
  });

  it("3-5 unfinished flips leader to second player", () => {
    const result = deriveCanonicalMatchResult({
      playedAt: "2026-09-03",
      primaryPlayerId: "nick",
      opponentPlayerId: "aidan",
      scoreText: "3-5",
      weight: 1,
      sourceText: null,
      statusHint: "completed",
    });
    assert.ok(!("error" in result));
    assert.equal(result.input.status, "unfinished");
    assert.equal(result.input.leaderPlayerId, "aidan");
    assert.equal(result.input.trailingPlayerId, "nick");
    assert.equal(result.input.scoreText, "5-3");
  });
});
