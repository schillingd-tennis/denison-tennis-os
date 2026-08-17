import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appendUnranked,
  applyVisibleOrderToMaster,
  CoachRankError,
  densifyCoachRanks,
  insertUnrankedAt,
  insertUnrankedIntoVisible,
  isDenseCoachRankSequence,
  masterRankedPersonIds,
  moveByRank,
  moveVisibleByRank,
  removeFromRanked,
  reorderFilteredMaster,
} from "./engine";

function assertDenseOrder(rankedPersonIds: readonly string[]): void {
  const ranks = densifyCoachRanks(rankedPersonIds).map((row) => row.coachRank);
  assert.equal(ranks.length, rankedPersonIds.length);
  assert.deepEqual(
    ranks,
    Array.from({ length: rankedPersonIds.length }, (_, index) => index + 1),
  );
  assert.equal(isDenseCoachRankSequence(ranks), true);
}

test("master reorder: #5 → #2", () => {
  const next = moveByRank(["1", "2", "3", "4", "5"], 5, 2);
  assert.deepEqual(next, ["1", "5", "2", "3", "4"]);
  assert.deepEqual(
    densifyCoachRanks(next).map((row) => row.coachRank),
    [1, 2, 3, 4, 5],
  );
});

test("downward move: #2 → #5", () => {
  const next = moveByRank(["1", "2", "3", "4", "5"], 2, 5);
  assert.deepEqual(next, ["1", "3", "4", "5", "2"]);
});

test("direct large move: #50 → #3", () => {
  const master = Array.from({ length: 50 }, (_, i) => `p${i + 1}`);
  const next = moveByRank(master, 50, 3);
  assert.equal(next[0], "p1");
  assert.equal(next[1], "p2");
  assert.equal(next[2], "p50");
  assert.equal(next[3], "p3");
  assert.equal(next[49], "p49");
  assert.equal(next.length, 50);
  assert.deepEqual(
    densifyCoachRanks(next).map((row) => row.coachRank),
    Array.from({ length: 50 }, (_, i) => i + 1),
  );
});

test("direct large move: #3 → #50", () => {
  const master = Array.from({ length: 50 }, (_, i) => `p${i + 1}`);
  const next = moveByRank(master, 3, 50);
  assert.equal(next[0], "p1");
  assert.equal(next[1], "p2");
  assert.equal(next[2], "p4");
  assert.equal(next[49], "p3");
});

test("filtered reorder: move E above C", () => {
  const master = ["A", "B", "C", "D", "E", "F"];
  const visible = ["A", "C", "E"];
  const nextMaster = reorderFilteredMaster(master, visible, 2, 1);
  assert.deepEqual(nextMaster, ["A", "B", "E", "D", "C", "F"]);
  assert.deepEqual(
    nextMaster.filter((id) => visible.includes(id)),
    ["A", "E", "C"],
  );
});

test("filtered reorder via visible ranks", () => {
  const next = moveVisibleByRank(["A", "B", "C", "D", "E", "F"], ["A", "C", "E"], 3, 2);
  assert.deepEqual(next, ["A", "B", "E", "D", "C", "F"]);
});

test("drag #4 between #1 and #2 densifies to A D B C", () => {
  const next = moveByRank(["A", "B", "C", "D"], 4, 2);
  assert.deepEqual(next, ["A", "D", "B", "C"]);
  assert.deepEqual(densifyCoachRanks(next), [
    { personId: "A", coachRank: 1 },
    { personId: "D", coachRank: 2 },
    { personId: "B", coachRank: 3 },
    { personId: "C", coachRank: 4 },
  ]);
});

test("applyVisibleOrderToMaster preserves hidden ranked positions", () => {
  const next = applyVisibleOrderToMaster(
    ["A", "B", "C", "D", "E", "F"],
    ["A", "C", "E"],
    ["A", "E", "C"],
  );
  assert.deepEqual(next, ["A", "B", "E", "D", "C", "F"]);
});

test("applyVisibleOrderToMaster no-filter order is the visible order", () => {
  const next = applyVisibleOrderToMaster(
    ["A", "B", "C", "D"],
    ["A", "B", "C", "D"],
    ["A", "D", "B", "C"],
  );
  assert.deepEqual(next, ["A", "D", "B", "C"]);
});

test("insert unranked D between A and B densifies to A D B C", () => {
  const next = insertUnrankedIntoVisible(["A", "B", "C"], ["A", "B", "C"], "D", 1);
  assert.deepEqual(next, ["A", "D", "B", "C"]);
  assert.deepEqual(densifyCoachRanks(next), [
    { personId: "A", coachRank: 1 },
    { personId: "D", coachRank: 2 },
    { personId: "B", coachRank: 3 },
    { personId: "C", coachRank: 4 },
  ]);
});

test("insert unranked at #1, middle, and bottom", () => {
  assert.deepEqual(insertUnrankedIntoVisible(["A", "B"], ["A", "B"], "D", 0), ["D", "A", "B"]);
  assert.deepEqual(insertUnrankedIntoVisible(["A", "B"], ["A", "B"], "D", 1), ["A", "D", "B"]);
  assert.deepEqual(insertUnrankedIntoVisible(["A", "B"], ["A", "B"], "D", 2), ["A", "B", "D"]);
});

test("insert unranked into empty ranked list", () => {
  assert.deepEqual(insertUnrankedIntoVisible([], [], "D", 0), ["D"]);
});

test("insert unranked into visible subsequence preserves hidden ranks", () => {
  assert.deepEqual(
    insertUnrankedIntoVisible(["A", "B", "C"], ["A", "C"], "E", 1),
    ["A", "B", "E", "C"],
  );
});

test("remove ranked B densifies remaining to A C", () => {
  const next = removeFromRanked(["A", "B", "C"], "B");
  assert.deepEqual(next, ["A", "C"]);
  assert.deepEqual(densifyCoachRanks(next), [
    { personId: "A", coachRank: 1 },
    { personId: "C", coachRank: 2 },
  ]);
});

test("add unranked at bottom", () => {
  const next = appendUnranked(["A", "B", "C"], "D");
  assert.deepEqual(next, ["A", "B", "C", "D"]);
});

test("insert unranked at #2", () => {
  const next = insertUnrankedAt(["A", "B", "C"], "D", 2);
  assert.deepEqual(next, ["A", "D", "B", "C"]);
  assert.deepEqual(densifyCoachRanks(next), [
    { personId: "A", coachRank: 1 },
    { personId: "D", coachRank: 2 },
    { personId: "B", coachRank: 3 },
    { personId: "C", coachRank: 4 },
  ]);
});

test("class-year departure densifies remaining", () => {
  const remaining = removeFromRanked(["A", "B", "C", "D"], "B");
  assert.deepEqual(remaining, ["A", "C", "D"]);
  assert.deepEqual(densifyCoachRanks(remaining), [
    { personId: "A", coachRank: 1 },
    { personId: "C", coachRank: 2 },
    { personId: "D", coachRank: 3 },
  ]);
});

test("class isolation: operating on 2027 order does not reference 2028 ids", () => {
  const class2027 = moveByRank(["a", "b", "c"], 3, 1);
  const class2028 = ["x", "y"];
  assert.deepEqual(class2027, ["c", "a", "b"]);
  assert.deepEqual(class2028, ["x", "y"]);
});

test("rejects inserting an already-ranked person", () => {
  assert.throws(() => insertUnrankedAt(["A", "B"], "A", 1), CoachRankError);
});

test("rejects visible ids that are not a master subsequence", () => {
  assert.throws(
    () => reorderFilteredMaster(["A", "B", "C"], ["C", "A"], 0, 1),
    CoachRankError,
  );
});

test("applyVisibleOrderToMaster rejects ids outside the visible subset", () => {
  assert.throws(
    () => applyVisibleOrderToMaster(["A", "B", "C"], ["A", "C"], ["A", "B"]),
    CoachRankError,
  );
});

test("gapped stored ranks densify to 1…N without reordering", () => {
  const ids = masterRankedPersonIds([
    { personId: "a", coachRank: 13 },
    { personId: "b", coachRank: 14 },
    { personId: "c", coachRank: 15 },
    { personId: "d", coachRank: 18 },
  ]);
  assert.deepEqual(ids, ["a", "b", "c", "d"]);
  assertDenseOrder(ids);
  assert.equal(isDenseCoachRankSequence([13, 14, 15, 18]), false);
  assert.equal(isDenseCoachRankSequence([1, 2, 3, 4]), true);
  assert.equal(isDenseCoachRankSequence([1, 2, 2, 4]), false);
});

test("every add/remove/reorder mutation yields a dense 1…N sequence", () => {
  const master = ["A", "B", "C", "D", "E", "F", "G", "H"];
  assertDenseOrder(insertUnrankedAt(master, "U", 1));
  assertDenseOrder(insertUnrankedAt(master, "U", 5));
  assertDenseOrder(appendUnranked(master, "U"));
  assertDenseOrder(removeFromRanked(master, "A"));
  assertDenseOrder(removeFromRanked(master, "D"));
  assertDenseOrder(removeFromRanked(master, "H"));
  assertDenseOrder(moveByRank(master, 8, 3));
  assertDenseOrder(moveByRank(master, 3, 8));
  assertDenseOrder(insertUnrankedIntoVisible(master, master, "U", 0));
  assertDenseOrder(insertUnrankedIntoVisible(master, master, "U", 4));
  assertDenseOrder(insertUnrankedIntoVisible(master, master, "U", master.length));
  assertDenseOrder(
    applyVisibleOrderToMaster(master, ["A", "C", "E"], ["E", "A", "C"]),
  );
  assertDenseOrder(moveVisibleByRank(master, ["A", "C", "E"], 3, 1));
});
