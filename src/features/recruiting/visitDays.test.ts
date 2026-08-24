import assert from "node:assert/strict";
import { test } from "node:test";

import { visitDayCount, visitRangeInvalid } from "./visitDays";

test("same-day visit is 1 day", () => {
  assert.equal(visitDayCount("2026-08-20", "2026-08-20"), 1);
});

test("inclusive multi-day calculation", () => {
  assert.equal(visitDayCount("2026-08-20", "2026-08-21"), 2);
  assert.equal(visitDayCount("2026-08-20", "2026-08-22"), 3);
});

test("missing date yields no day count", () => {
  assert.equal(visitDayCount(undefined, "2026-08-20"), null);
  assert.equal(visitDayCount("2026-08-20", undefined), null);
  assert.equal(visitDayCount("", "2026-08-20"), null);
});

test("end before start is invalid and has no day count", () => {
  assert.equal(visitRangeInvalid("2026-08-22", "2026-08-20"), true);
  assert.equal(visitDayCount("2026-08-22", "2026-08-20"), null);
});
