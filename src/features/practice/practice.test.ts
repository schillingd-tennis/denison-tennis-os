import assert from "node:assert/strict";
import test from "node:test";

import { PRACTICE_TABS } from "./types";
import { TEAM_OPERATIONS_PRACTICE_ROUTE, TOP_LEVEL_MODULE_PATHS, isTopLevelModulePage } from "@/lib/module-routes";
import { calculateDayRule, calculateMonthlyPracticeBudget, enumerateDates } from "./dayRule";
import { buildDayRuleCalendarCells, buildDayRuleCalendarCounts, practiceCalendarYear } from "./dayRuleCalendar";
import { moveItem } from "./reorder";

test("Practice uses one Team Operations route with six internal tabs", () => {
  assert.equal(TEAM_OPERATIONS_PRACTICE_ROUTE, "/team-operations/practice");
  assert.equal(isTopLevelModulePage(TEAM_OPERATIONS_PRACTICE_ROUTE), true);
  assert.equal(TOP_LEVEL_MODULE_PATHS.includes(TEAM_OPERATIONS_PRACTICE_ROUTE), true);
  assert.deepEqual(PRACTICE_TABS.map((tab) => tab.label), ["Daily Plan", "Drill Library", "114-Day Tracker", "Calendar", "Dates of Competition", "Practice Log"]);
});

test("114-day calendar builds the active academic-season month grid", () => {
  const summary = calculateDayRule(
    ["2026-09-03"],
    [{ start: "2026-09-18", end: "2026-09-20", label: "Invite" }],
    "2026-09-10",
  );
  const september = summary.rows.find((row) => row.month === 9);
  assert.ok(september);
  const cells = buildDayRuleCalendarCells(september, "2026-09-10");
  assert.equal(cells.length, 35);
  assert.equal(cells[2]?.date, "2026-09-01");
  assert.equal(cells[31]?.date, "2026-09-30");
  assert.equal(practiceCalendarYear(2, "2026-09-10"), 2027);
});

test("calendar dates show cumulative 114-day and monthly-budget counts", () => {
  const summary = calculateDayRule(
    ["2026-08-28", "2026-09-01", "2026-09-02"],
    [{ start: "2026-09-02", end: "2026-09-03", label: "Invite" }],
    "2026-09-10",
  );
  const counts = buildDayRuleCalendarCounts(summary, "2026-09-10");

  assert.deepEqual(counts.get("2026-09-01"), {
    seasonCount: 2,
    monthCount: 1,
    monthBudget: 18,
  });
  assert.deepEqual(counts.get("2026-09-02"), {
    seasonCount: 3,
    monthCount: 2,
    monthBudget: 18,
  });
  assert.deepEqual(counts.get("2026-09-03"), {
    seasonCount: 4,
    monthCount: 3,
    monthBudget: 18,
  });
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

test("monthly practice budget separates practices from scheduled competition dates", () => {
  const summary = calculateDayRule(
    ["2026-09-02", "2026-09-06", "2026-09-22"],
    [{ start: "2026-09-18", end: "2026-09-20", label: "Invite" }],
    "2026-09-07",
  );
  const september = summary.rows.find((row) => row.month === 9);
  assert.ok(september);
  assert.deepEqual(calculateMonthlyPracticeBudget(september, "2026-09-07"), {
    practices: 2,
    competitionDates: 3,
    practicesBudgeted: 15,
    variance: 13,
  });
  assert.equal(summary.yearToDateBudget, 20);
  assert.equal(summary.yearToDateUsed, 5);
  assert.equal(summary.yearToDateVariance, 15);
});

test("year-to-date usage counts upcoming DOCs once but not future practices", () => {
  const summary = calculateDayRule(
    ["2026-08-20", "2026-09-05", "2026-09-18", "2026-09-29"],
    [{ start: "2026-09-18", end: "2026-09-20", label: "Invite" }],
    "2026-09-10",
  );

  assert.equal(summary.yearToDateBudget, 20);
  assert.equal(summary.yearToDateUsed, 5);
  assert.equal(summary.yearToDateVariance, 15);
});
