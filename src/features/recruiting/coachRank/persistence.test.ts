import assert from "node:assert/strict";
import { test } from "node:test";

import { getWritableRecruitProfileFieldMap } from "../fieldCatalog";
import { recruitProfilePatchToRow } from "../supabaseMapping";

test("priority patch does not write coach_rank", () => {
  const row = recruitProfilePatchToRow({
    priorityId: "c1500000-0000-4000-8000-000000000001",
  });
  assert.equal("coach_rank" in row, false);
  assert.equal(row.priority_id, "c1500000-0000-4000-8000-000000000001");
});

test("coachRank is excluded from general writable field map", () => {
  const map = getWritableRecruitProfileFieldMap();
  assert.equal(map.coachRank, undefined);
  assert.equal(map.priorityId, "priority_id");
  assert.equal(map.recruitClassYear, "recruit_class_year");
});

test("explicit coachRank patch is ignored by row mapper", () => {
  const row = recruitProfilePatchToRow({
    coachRank: 3,
    interestId: "interest-1",
  });
  assert.equal("coach_rank" in row, false);
  assert.equal(row.interest_id, "interest-1");
});
