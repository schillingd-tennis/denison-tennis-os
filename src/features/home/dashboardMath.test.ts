import assert from "node:assert/strict";
import test from "node:test";

import { dayRulePercent, sparklinePoints } from "./dashboardMath";

test("sparklinePoints handles empty and flat data", () => {
  assert.equal(sparklinePoints([]), "");
  assert.equal(sparklinePoints([1500]), "210,84");
});

test("sparklinePoints spans the chart from first to last value", () => {
  assert.equal(sparklinePoints([1400, 1500], 100, 50), "0,42 100,8");
});

test("dayRulePercent clamps invalid and over-limit totals", () => {
  assert.equal(dayRulePercent(57, 114), 50);
  assert.equal(dayRulePercent(120, 114), 100);
  assert.equal(dayRulePercent(10, 0), 0);
});
