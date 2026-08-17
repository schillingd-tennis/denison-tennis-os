import assert from "node:assert/strict";
import { test } from "node:test";

import type { RecruitDirectoryRow } from "../directory";
import { applyCoachRanksToCohort, densifyExistingClassOrder } from "./cohort";
import { isDenseCoachRankSequence } from "./engine";

function row(
  id: string,
  classYear: number,
  coachRank?: number,
): RecruitDirectoryRow {
  return {
    person: { id } as RecruitDirectoryRow["person"],
    profile: { recruitClassYear: classYear, coachRank } as RecruitDirectoryRow["profile"],
    analytics: {} as RecruitDirectoryRow["analytics"],
  };
}

test("applyCoachRanksToCohort densifies one class and leaves others untouched", () => {
  const cohort = [
    row("a", 2027, 1),
    row("b", 2027, 2),
    row("c", 2027, 3),
    row("x", 2028, 1),
    row("u", 2027),
  ];
  const next = applyCoachRanksToCohort(cohort, 2027, ["a", "c", "b"]);
  assert.equal(next[0].profile.coachRank, 1);
  assert.equal(next[1].profile.coachRank, 3);
  assert.equal(next[2].profile.coachRank, 2);
  assert.equal(next[3].profile.coachRank, 1);
  assert.equal(next[4].profile.coachRank, undefined);
});

test("densifyExistingClassOrder repairs gaps while preserving relative order", () => {
  const cohort = [
    row("a", 2027, 13),
    row("b", 2027, 14),
    row("c", 2027, 15),
    row("d", 2027, 18),
    row("x", 2028, 4),
    row("u", 2027),
  ];
  const result = densifyExistingClassOrder(cohort, 2027);
  assert.equal(result.changed, true);
  assert.deepEqual(result.rankedPersonIds, ["a", "b", "c", "d"]);
  assert.equal(result.rows[0].profile.coachRank, 1);
  assert.equal(result.rows[1].profile.coachRank, 2);
  assert.equal(result.rows[2].profile.coachRank, 3);
  assert.equal(result.rows[3].profile.coachRank, 4);
  assert.equal(result.rows[4].profile.coachRank, 4);
  assert.equal(result.rows[5].profile.coachRank, undefined);
  assert.equal(
    isDenseCoachRankSequence(
      result.rows
        .filter((entry) => entry.profile.recruitClassYear === 2027 && entry.profile.coachRank !== undefined)
        .map((entry) => entry.profile.coachRank as number),
    ),
    true,
  );
});

test("densifyExistingClassOrder is a no-op when already dense", () => {
  const cohort = [row("a", 2027, 1), row("b", 2027, 2)];
  const result = densifyExistingClassOrder(cohort, 2027);
  assert.equal(result.changed, false);
  assert.equal(result.rows[0].profile.coachRank, 1);
  assert.equal(result.rows[1].profile.coachRank, 2);
});
