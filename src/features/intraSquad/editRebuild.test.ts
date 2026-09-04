import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import { ELO_K_BY_WEIGHT, ELO_STARTING_RATING, sortMatchesChronologically } from "./elo";
import { classifyMatchCompleteness } from "./matchValue";
import {
  applyCanonicalMatchAndRebuild,
  INTRA_SQUAD_REBUILD_TRIGGER_FIELDS,
  rebuildIntraSquadDerivedState,
  removeCanonicalMatchAndRebuild,
} from "./rebuildDerivedState";
import { currentRosterPlayers } from "./roster";
import type { IntraSquadMatch, RosterPlayer } from "./types";

const workspaceSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadWorkspace.tsx"),
  "utf8",
);
const formSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/components/IntraSquadMatchForm.tsx"),
  "utf8",
);
const actionsSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/actions.ts"),
  "utf8",
);
const rebuildSource = readFileSync(
  path.join(process.cwd(), "src/features/intraSquad/rebuildDerivedState.ts"),
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
  person("arya", "Arya", "Ganapathy"),
  person("minato", "Minato", "Koido"),
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

function recordOf(derived: ReturnType<typeof rebuildIntraSquadDerivedState>, playerId: string) {
  return derived.records.find((row) => row.playerId === playerId);
}

function mvOf(derived: ReturnType<typeof rebuildIntraSquadDerivedState>, playerId: string) {
  return derived.matchValueStandings.get(playerId);
}

describe("Intra Squad edit → full derived rebuild", () => {
  it("exposes rebuild trigger fields covering meaning-changing edits", () => {
    for (const field of [
      "playedAt",
      "status",
      "winnerPlayerId",
      "loserPlayerId",
      "leaderPlayerId",
      "trailingPlayerId",
      "scoreText",
      "scoreSets",
      "weight",
    ] as const) {
      assert.ok(INTRA_SQUAD_REBUILD_TRIGGER_FIELDS.includes(field), field);
    }
  });

  it("1. completed win → opposite winner flips W-L, WP, Elo, Match Value, sets/games", () => {
    const original = match({
      id: "bk",
      winnerPlayerId: "balraj",
      loserPlayerId: "kyle",
      scoreText: "6-1, 6-1",
      weight: 1,
    });
    const before = rebuildIntraSquadDerivedState([original], roster);
    assert.equal(recordOf(before, "balraj")?.wins, 1);
    assert.equal(recordOf(before, "kyle")?.losses, 1);
    assert.equal(recordOf(before, "balraj")?.weightedNet, 1);
    assert.equal(mvOf(before, "balraj")?.totalMatchValue, 1);
    assert.equal(mvOf(before, "balraj")?.setsWon, 2);
    assert.equal(mvOf(before, "balraj")?.gamesWon, 12);

    const reversed = match({
      id: "bk",
      winnerPlayerId: "kyle",
      loserPlayerId: "balraj",
      scoreText: "6-1, 6-1",
      weight: 1,
      updatedAt: "2026-09-03T13:00:00.000Z",
    });
    const { derived: after } = applyCanonicalMatchAndRebuild([original], reversed, roster);

    assert.equal(recordOf(after, "balraj")?.wins, 0);
    assert.equal(recordOf(after, "balraj")?.losses, 1);
    assert.equal(recordOf(after, "kyle")?.wins, 1);
    assert.equal(recordOf(after, "kyle")?.losses, 0);
    assert.equal(recordOf(after, "balraj")?.weightedNet, -1);
    assert.equal(recordOf(after, "kyle")?.weightedNet, 1);
    assert.equal(mvOf(after, "kyle")?.totalMatchValue, 1);
    assert.equal(mvOf(after, "balraj")?.totalMatchValue, -1);
    assert.equal(mvOf(after, "kyle")?.setsWon, 2);
    assert.equal(mvOf(after, "balraj")?.setsWon, 0);
    assert.ok(after.elo.ratings.get("kyle")! > ELO_STARTING_RATING);
    assert.ok(after.elo.ratings.get("balraj")! < ELO_STARTING_RATING);
    assert.equal(after.rankings[0]?.playerId, "kyle");
    assert.equal(after.top5[0]?.playerId, "kyle");
    assert.equal(after.dashboard.totalMatches, 1);
  });

  it("2. completed → unfinished removes W-L and applies UF credit / Elo / Match Value", () => {
    const original = match({
      id: "na",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      scoreText: "6-2",
      scoreSets: [{ winnerGames: 6, loserGames: 2 }],
      weight: 1,
    });
    assert.equal(classifyMatchCompleteness(original), "one_set_completed");
    const before = rebuildIntraSquadDerivedState([original], roster);
    assert.equal(recordOf(before, "nick")?.wins, 1);
    assert.equal(recordOf(before, "aidan")?.losses, 1);
    assert.equal(mvOf(before, "nick")?.totalMatchValue, 0.6);

    const edited = unfinished({
      id: "na",
      leaderPlayerId: "nick",
      trailingPlayerId: "aidan",
      scoreText: "6-2, 2-3",
      scoreSets: [
        { winnerGames: 6, loserGames: 2 },
        { winnerGames: 2, loserGames: 3 },
      ],
      weight: 1,
    });
    const { derived: after } = applyCanonicalMatchAndRebuild([original], edited, roster);

    assert.equal(recordOf(after, "nick")?.wins, 0);
    assert.equal(recordOf(after, "nick")?.losses, 0);
    assert.equal(recordOf(after, "aidan")?.wins, 0);
    assert.equal(recordOf(after, "aidan")?.losses, 0);
    assert.equal(recordOf(after, "nick")?.unfinishedLeading, 1);
    assert.equal(recordOf(after, "aidan")?.unfinishedTrailing, 1);
    assert.equal(recordOf(after, "nick")?.weightedNet, 0.5);
    assert.equal(recordOf(after, "aidan")?.weightedNet, -0.5);
    assert.equal(after.elo.standings.get("nick")?.history[0]?.actualResult, 0.75);
    assert.equal(after.elo.standings.get("aidan")?.history[0]?.actualResult, 0.25);
    assert.equal(classifyMatchCompleteness(edited), "unfinished");
    assert.ok((mvOf(after, "nick")?.totalMatchValue ?? 0) > 0);
    assert.ok((mvOf(after, "nick")?.totalMatchValue ?? 0) < 0.9);
    assert.notEqual(mvOf(after, "nick")?.totalMatchValue, 0.6);
  });

  it("3. unfinished → completed replaces UF with full W-L / Elo 1.0 / completed Match Value", () => {
    const original = unfinished({
      id: "cj",
      leaderPlayerId: "chika",
      trailingPlayerId: "jackson",
      scoreText: "6-4, 3-2",
      weight: 1,
    });
    const before = rebuildIntraSquadDerivedState([original], roster);
    assert.equal(recordOf(before, "chika")?.unfinishedLeading, 1);
    assert.equal(recordOf(before, "chika")?.wins, 0);
    assert.equal(before.elo.standings.get("chika")?.history[0]?.actualResult, 0.75);

    const completed = match({
      id: "cj",
      winnerPlayerId: "chika",
      loserPlayerId: "jackson",
      leaderPlayerId: null,
      trailingPlayerId: null,
      scoreText: "6-4, 6-3",
      scoreSets: [
        { winnerGames: 6, loserGames: 4 },
        { winnerGames: 6, loserGames: 3 },
      ],
      weight: 1,
    });
    const { derived: after } = applyCanonicalMatchAndRebuild([original], completed, roster);

    assert.equal(recordOf(after, "chika")?.unfinishedLeading, 0);
    assert.equal(recordOf(after, "jackson")?.unfinishedTrailing, 0);
    assert.equal(recordOf(after, "chika")?.wins, 1);
    assert.equal(recordOf(after, "jackson")?.losses, 1);
    assert.equal(recordOf(after, "chika")?.weightedNet, 1);
    assert.equal(after.elo.standings.get("chika")?.history[0]?.actualResult, 1);
    assert.equal(after.elo.standings.get("jackson")?.history[0]?.actualResult, 0);
    assert.equal(mvOf(after, "chika")?.totalMatchValue, 1);
    assert.equal(classifyMatchCompleteness(completed), "full_completed");
  });

  it("4. weight 1 → 3 rebuilds Weighted Points, Elo K, and Match Value; W-L unchanged", () => {
    const original = match({
      id: "w",
      winnerPlayerId: "balraj",
      loserPlayerId: "kyle",
      weight: 1,
    });
    const follow = match({
      id: "f",
      winnerPlayerId: "balraj",
      loserPlayerId: "arya",
      weight: 1,
      playedAt: "2026-09-04",
      createdAt: "2026-09-04T12:00:00.000Z",
    });
    const before = rebuildIntraSquadDerivedState([original, follow], roster);
    assert.equal(recordOf(before, "balraj")?.wins, 2);
    assert.equal(recordOf(before, "balraj")?.weightedNet, 2);
    assert.equal(mvOf(before, "balraj")?.totalMatchValue, 2);
    assert.equal(before.elo.standings.get("balraj")?.history[0]?.kFactor, ELO_K_BY_WEIGHT[1]);

    const heavier = { ...original, weight: 3 as const };
    const { derived: after } = applyCanonicalMatchAndRebuild([original, follow], heavier, roster);

    assert.equal(recordOf(after, "balraj")?.wins, 2);
    assert.equal(recordOf(after, "balraj")?.losses, 0);
    assert.equal(recordOf(after, "balraj")?.weightedNet, 4);
    assert.equal(mvOf(after, "balraj")?.totalMatchValue, 4);
    assert.equal(after.elo.standings.get("balraj")?.history[0]?.kFactor, ELO_K_BY_WEIGHT[3]);
    assert.ok(after.elo.ratings.get("balraj")! > before.elo.ratings.get("balraj")!);
  });

  it("5. score one-set → full completed changes Match Value and set/game totals", () => {
    const oneSet = match({
      id: "os",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      scoreText: "6-2",
      scoreSets: [{ winnerGames: 6, loserGames: 2 }],
      weight: 1,
    });
    const before = rebuildIntraSquadDerivedState([oneSet], roster);
    assert.equal(classifyMatchCompleteness(oneSet), "one_set_completed");
    assert.equal(mvOf(before, "nick")?.totalMatchValue, 0.6);
    assert.equal(mvOf(before, "nick")?.oneSetWins, 1);
    assert.equal(mvOf(before, "nick")?.fullWins, 0);

    const full = {
      ...oneSet,
      scoreText: "6-2, 6-3",
      scoreSets: [
        { winnerGames: 6, loserGames: 2 },
        { winnerGames: 6, loserGames: 3 },
      ],
    };
    const { derived: after } = applyCanonicalMatchAndRebuild([oneSet], full, roster);
    assert.equal(classifyMatchCompleteness(full), "full_completed");
    assert.equal(mvOf(after, "nick")?.totalMatchValue, 1);
    assert.equal(mvOf(after, "nick")?.fullWins, 1);
    assert.equal(mvOf(after, "nick")?.oneSetWins, 0);
    assert.equal(mvOf(after, "nick")?.setsWon, 2);
    assert.equal(mvOf(after, "nick")?.gamesWon, 12);
    assert.equal(recordOf(after, "nick")?.wins, 1);
  });

  it("6. unfinished score change can flip leader and rebuild UF metrics", () => {
    const original = unfinished({
      id: "uf",
      leaderPlayerId: "nick",
      trailingPlayerId: "aidan",
      scoreText: "6-2, 2-3",
      scoreSets: [
        { winnerGames: 6, loserGames: 2 },
        { winnerGames: 2, loserGames: 3 },
      ],
    });
    const before = rebuildIntraSquadDerivedState([original], roster);
    assert.equal(recordOf(before, "nick")?.unfinishedLeading, 1);

    const flipped = unfinished({
      id: "uf",
      leaderPlayerId: "aidan",
      trailingPlayerId: "nick",
      scoreText: "6-2, 5-2",
      scoreSets: [
        { winnerGames: 6, loserGames: 2 },
        { winnerGames: 5, loserGames: 2 },
      ],
    });
    const { derived: after } = applyCanonicalMatchAndRebuild([original], flipped, roster);
    assert.equal(recordOf(after, "aidan")?.unfinishedLeading, 1);
    assert.equal(recordOf(after, "nick")?.unfinishedTrailing, 1);
    assert.equal(recordOf(after, "nick")?.unfinishedLeading, 0);
    assert.ok((mvOf(after, "aidan")?.totalMatchValue ?? 0) > 0);
    assert.ok((mvOf(after, "nick")?.totalMatchValue ?? 0) < 0);
  });

  it("7. date change reorders Elo chronologically for later matches", () => {
    const early = match({
      id: "early",
      winnerPlayerId: "nick",
      loserPlayerId: "minato",
      weight: 1,
      playedAt: "2026-09-01",
      createdAt: "2026-09-01T12:00:00.000Z",
    });
    const late = match({
      id: "late",
      winnerPlayerId: "arya",
      loserPlayerId: "nick",
      weight: 1,
      playedAt: "2026-09-05",
      createdAt: "2026-09-05T12:00:00.000Z",
    });
    const before = rebuildIntraSquadDerivedState([early, late], roster);
    const nickBeforeLate = before.elo.standings.get("nick")!.history.find((e) => e.matchId === "late")!;
    assert.ok(nickBeforeLate.ratingBefore > ELO_STARTING_RATING);

    // Move Nick's win after Arya's win — Nick starts from 1500 into the Arya match.
    const moved = { ...early, playedAt: "2026-09-08", createdAt: "2026-09-08T12:00:00.000Z" };
    const { derived: after } = applyCanonicalMatchAndRebuild([early, late], moved, roster);
    const chronological = sortMatchesChronologically(after.orderedMatches);
    assert.equal(chronological[0]?.id, "late");
    assert.equal(chronological[1]?.id, "early");

    const nickIntoArya = after.elo.standings.get("nick")!.history.find((e) => e.matchId === "late")!;
    assert.equal(nickIntoArya.ratingBefore, ELO_STARTING_RATING);
    assert.notEqual(after.elo.ratings.get("nick"), before.elo.ratings.get("nick"));
    assert.equal(after.dashboard.lastMatch?.id, "early");
  });

  it("8. player identity correction updates both records without duplicate credit", () => {
    const original = match({
      id: "id",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      weight: 1,
    });
    const corrected = match({
      id: "id",
      winnerPlayerId: "balraj",
      loserPlayerId: "kyle",
      weight: 1,
    });
    const { derived: after } = applyCanonicalMatchAndRebuild([original], corrected, roster);

    assert.equal(recordOf(after, "nick"), undefined);
    assert.equal(recordOf(after, "aidan"), undefined);
    assert.equal(recordOf(after, "balraj")?.wins, 1);
    assert.equal(recordOf(after, "kyle")?.losses, 1);
    assert.equal(after.records.length, 2);
    assert.equal(after.elo.standings.size, 2);
  });

  it("9–15. single rebuild refreshes WP, Match Value, Elo, sets/games, rankings, Top 5, player detail inputs", () => {
    const a = match({ id: "a", winnerPlayerId: "balraj", loserPlayerId: "kyle", weight: 2 });
    const b = unfinished({
      id: "b",
      leaderPlayerId: "chika",
      trailingPlayerId: "jackson",
      weight: 1,
      playedAt: "2026-09-02",
      createdAt: "2026-09-02T12:00:00.000Z",
    });
    const derived = rebuildIntraSquadDerivedState([a, b], roster);

    assert.equal(recordOf(derived, "balraj")?.weightedNet, 2);
    assert.equal(mvOf(derived, "balraj")?.totalMatchValue, 2);
    assert.ok(derived.elo.ratings.get("balraj")! > ELO_STARTING_RATING);
    assert.equal(mvOf(derived, "balraj")?.setsWon, 2);
    assert.equal(mvOf(derived, "balraj")?.gameDiff, 10);
    assert.equal(derived.rankings[0]?.playerId, "balraj");
    assert.equal(derived.top5[0]?.playerId, "balraj");
    assert.ok(derived.top5.length <= 5);
    assert.equal(derived.dashboard.totalMatches, 2);
    assert.equal(derived.dashboard.activePlayers, 4);

    const detailBalraj = {
      record: recordOf(derived, "balraj") ?? null,
      rankingRow: derived.rankings.find((row) => row.playerId === "balraj") ?? null,
      matchValueRow: derived.matchValueRankings.find((row) => row.playerId === "balraj") ?? null,
      eloRow: derived.eloRankings.find((row) => row.playerId === "balraj") ?? null,
    };
    assert.equal(detailBalraj.record?.wins, 1);
    assert.equal(detailBalraj.rankingRow?.rank, 1);
    assert.equal(detailBalraj.matchValueRow?.totalMatchValue, 2);
    assert.ok((detailBalraj.eloRow?.rating ?? 0) > ELO_STARTING_RATING);
  });

  it("16. refresh persistence: rebuild from canonical list alone (no client delta cache)", () => {
    const saved = match({
      id: "persist",
      winnerPlayerId: "kyle",
      loserPlayerId: "balraj",
      weight: 1,
    });
    const first = rebuildIntraSquadDerivedState([saved], roster);
    const afterRefresh = rebuildIntraSquadDerivedState([saved], roster);
    assert.deepEqual(
      afterRefresh.records.map((r) => ({ ...r })),
      first.records.map((r) => ({ ...r })),
    );
    assert.equal(afterRefresh.elo.ratings.get("kyle"), first.elo.ratings.get("kyle"));
    assert.equal(afterRefresh.matchValueByPlayerId.get("kyle"), first.matchValueByPlayerId.get("kyle"));
  });

  it("17. failed save leaves prior derived state intact", () => {
    const original = match({
      id: "fail",
      winnerPlayerId: "nick",
      loserPlayerId: "aidan",
      weight: 1,
    });
    const priorMatches = [original];
    const priorDerived = rebuildIntraSquadDerivedState(priorMatches, roster);

    // Simulate form: server returns error → do not call applyCanonicalMatchAndRebuild
    const saveFailed = true;
    const nextMatches = saveFailed ? priorMatches : [match({ id: "fail", winnerPlayerId: "aidan", loserPlayerId: "nick" })];
    const nextDerived = rebuildIntraSquadDerivedState(nextMatches, roster);

    assert.equal(nextMatches, priorMatches);
    assert.equal(recordOf(nextDerived, "nick")?.wins, recordOf(priorDerived, "nick")?.wins);
    assert.equal(nextDerived.elo.ratings.get("nick"), priorDerived.elo.ratings.get("nick"));
    assert.match(formSource, /if \(!result\.success\)/);
    assert.match(formSource, /setError\(result\.error\)/);
    assert.doesNotMatch(formSource, /onSaved\(result\.match\);\s*}\s*if \(!result/);
  });

  it("18. no duplicate result credit after edit (single match row → single history event)", () => {
    const original = match({ id: "dup", winnerPlayerId: "balraj", loserPlayerId: "kyle" });
    const reversed = match({ id: "dup", winnerPlayerId: "kyle", loserPlayerId: "balraj" });
    const { matches, derived } = applyCanonicalMatchAndRebuild([original], reversed, roster);

    assert.equal(matches.filter((row) => row.id === "dup").length, 1);
    assert.equal(derived.elo.standings.get("kyle")?.history.length, 1);
    assert.equal(derived.elo.standings.get("balraj")?.history.length, 1);
    assert.equal(mvOf(derived, "kyle")?.matchesPlayed, 1);
    assert.equal(recordOf(derived, "kyle")?.wins, 1);
    assert.equal(recordOf(derived, "kyle")?.losses, 0);
  });

  it("delete also rebuilds derived state centrally", () => {
    const keep = match({ id: "keep", winnerPlayerId: "nick", loserPlayerId: "aidan" });
    const drop = match({ id: "drop", winnerPlayerId: "balraj", loserPlayerId: "kyle" });
    const { derived } = removeCanonicalMatchAndRebuild([keep, drop], "drop", roster);
    assert.equal(derived.dashboard.totalMatches, 1);
    assert.equal(recordOf(derived, "balraj"), undefined);
    assert.equal(recordOf(derived, "nick")?.wins, 1);
  });

  it("workspace wires commit → rebuild + router.refresh; actions revalidate path", () => {
    assert.match(workspaceSource, /rebuildIntraSquadDerivedState/);
    assert.match(workspaceSource, /applyCanonicalMatchAndRebuild/);
    assert.match(workspaceSource, /commitSavedMatch/);
    assert.match(workspaceSource, /router\.refresh\(\)/);
    assert.match(workspaceSource, /refreshOpenPlayerDetail/);
    assert.match(actionsSource, /revalidatePath\(TEAM_OPERATIONS_INTRA_SQUAD_ROUTE\)/);
    assert.match(rebuildSource, /export function rebuildIntraSquadDerivedState/);
    assert.doesNotMatch(rebuildSource, /old Elo|delta patch|subtract old/i);
  });
});
