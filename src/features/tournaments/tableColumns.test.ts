import assert from "node:assert/strict";
import test from "node:test";

import { TOURNAMENT_TABLE_COLUMNS } from "./tableColumns";

test("directory columns do not include Surface or Plan", () => {
  const titles = TOURNAMENT_TABLE_COLUMNS.map((column) => column.title);
  const ids = TOURNAMENT_TABLE_COLUMNS.map((column) => column.id as string);
  assert.equal(titles.includes("Surface"), false);
  assert.equal(titles.includes("Plan"), false);
  assert.equal(ids.includes("surface"), false);
  assert.equal(ids.includes("recruitingPlan"), false);
  assert.deepEqual(titles, [
    "Tournament",
    "Start",
    "End",
    "City",
    "State",
    "Level",
    "Status",
    "Distance",
    "Recruits",
  ]);
});
