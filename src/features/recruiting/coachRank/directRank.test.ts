import assert from "node:assert/strict";
import { test } from "node:test";

import { densifyCoachRanks, moveByRank } from "./engine";
import { parseDirectCoachRank } from "./directRank";

test("same rank is a no-op", () => {
  assert.deepEqual(parseDirectCoachRank("4", 4, 18), { status: "same" });
  assert.deepEqual(parseDirectCoachRank(" 4 ", 4, 18), { status: "same" });
});

test("valid destination is a master move", () => {
  assert.deepEqual(parseDirectCoachRank("4", 18, 18), { status: "move", toRank: 4 });
  assert.deepEqual(parseDirectCoachRank("1", 18, 18), { status: "move", toRank: 1 });
  assert.deepEqual(parseDirectCoachRank("18", 1, 18), { status: "move", toRank: 18 });
});

test("rejects blank, zero, negative, non-numeric, and too-large ranks", () => {
  assert.equal(parseDirectCoachRank("", 4, 18).status, "invalid");
  assert.equal(parseDirectCoachRank("   ", 4, 18).status, "invalid");
  assert.equal(parseDirectCoachRank("0", 4, 18).status, "invalid");
  assert.equal(parseDirectCoachRank("-1", 4, 18).status, "invalid");
  assert.equal(parseDirectCoachRank("4.5", 4, 18).status, "invalid");
  assert.equal(parseDirectCoachRank("abc", 4, 18).status, "invalid");
  assert.equal(parseDirectCoachRank("19", 4, 18).status, "invalid");
});

test("range uses the full ranked population, not the visible count", () => {
  assert.deepEqual(parseDirectCoachRank("25", 5, 25), { status: "move", toRank: 25 });
  assert.equal(parseDirectCoachRank("9", 5, 8).status, "invalid");
});

test("typed #5 → #2 uses moveByRank on the master order", () => {
  const parsed = parseDirectCoachRank("2", 5, 5);
  assert.equal(parsed.status, "move");
  if (parsed.status !== "move") return;
  const next = moveByRank(["A", "B", "C", "D", "E"], 5, parsed.toRank);
  assert.deepEqual(next, ["A", "E", "B", "C", "D"]);
  assert.deepEqual(
    densifyCoachRanks(next).map((row) => row.coachRank),
    [1, 2, 3, 4, 5],
  );
});

test("filtered display #5 → 2 still means master rank 2", () => {
  const master = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const parsed = parseDirectCoachRank("2", 5, master.length);
  assert.deepEqual(parsed, { status: "move", toRank: 2 });
  if (parsed.status !== "move") return;
  const next = moveByRank(master, 5, parsed.toRank);
  assert.deepEqual(next, ["A", "E", "B", "C", "D", "F", "G", "H", "I"]);
});
