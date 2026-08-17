import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveRankClassYearFromFilters } from "./classYear";

test("exactly one class year filter resolves ready", () => {
  assert.deepEqual(resolveRankClassYearFromFilters(["classYear:2027", "priority:elite"]), {
    status: "ready",
    classYear: 2027,
  });
});

test("no class year filter requires choose", () => {
  assert.deepEqual(resolveRankClassYearFromFilters(["priority:elite"]), {
    status: "choose",
    reason: "none",
  });
});

test("multiple class years require choose", () => {
  assert.deepEqual(resolveRankClassYearFromFilters(["classYear:2027", "classYear:2028"]), {
    status: "choose",
    reason: "multiple",
  });
});

test("classYear:none cannot be ranked", () => {
  assert.deepEqual(resolveRankClassYearFromFilters(["classYear:none"]), {
    status: "choose",
    reason: "none_year",
  });
});
