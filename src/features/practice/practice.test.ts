import assert from "node:assert/strict";
import test from "node:test";

import { PRACTICE_TABS } from "./types";
import { TEAM_OPERATIONS_PRACTICE_ROUTE, TOP_LEVEL_MODULE_PATHS, isTopLevelModulePage } from "@/lib/module-routes";
import { calculateDayRule, enumerateDates } from "./dayRule";
import { moveItem } from "./reorder";

test("Practice uses one Team Operations route with five internal tabs", () => {
  assert.equal(TEAM_OPERATIONS_PRACTICE_ROUTE, "/team-operations/practice");
  assert.equal(isTopLevelModulePage(TEAM_OPERATIONS_PRACTICE_ROUTE), true);
  assert.equal(TOP_LEVEL_MODULE_PATHS.includes(TEAM_OPERATIONS_PRACTICE_ROUTE), true);
  assert.deepEqual(PRACTICE_TABS.map((tab) => tab.label), ["Daily Plan", "Drill Library", "Dates of Competition", "114-Day Tracker", "Practice Log"]);
});

test("drill sequence reorders optimistically without mutating the original", () => {
  const original = ["serve", "return", "points"];
  assert.deepEqual(moveItem(original, 0, 2), ["return", "points", "serve"]);
  assert.deepEqual(original, ["serve", "return", "points"]);
});

test("multi-day competition counts every calendar day without double counting practice overlap", () => {
  assert.deepEqual(enumerateDates("2026-09-18", "2026-09-20"), ["2026-09-18", "2026-09-19", "2026-09-20"]);
  const summary = calculateDayRule([{ date: "2026-09-18", label: "Practice" }, "2026-09-21"], [{ start: "2026-09-18", end: "2026-09-20", label: "Invite" }], "2026-09-21");
  assert.equal(summary.used, 4); assert.equal(summary.rows.find((row) => row.month === 9)?.used, 4);
  assert.equal(summary.budgetTotal, 114); assert.equal(summary.limit, 114);
  assert.equal(summary.rows.find((row) => row.month === 9)?.days[0]?.sources.length, 2);
  assert.equal(summary.budgetToDate, 15);
  assert.equal(summary.varianceToDate, 11);
});
