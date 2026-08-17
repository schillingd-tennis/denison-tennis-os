import assert from "node:assert/strict";
import { test } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import type { RecruitDirectoryRow } from "./directory";
import { recomputeDirectoryAnalytics, replacePersonInCohort } from "./directoryInline";
import type { RecruitProfile } from "./types";

function person(partial: Partial<Person> & Pick<Person, "id" | "wtn">): Person {
  return {
    firstName: "Test",
    lastName: "Recruit",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    relationships: [],
    roleId: "role-recruit",
    statusId: "status-current",
    role: { id: "role-recruit", key: ROLE_KEYS.recruit, label: "Recruit" },
    status: { id: "status-current", key: STATUS_KEYS.current, label: "Current" },
    ...partial,
  };
}

function row(id: string, tennis: { utr?: number; wtn?: number; trnRank?: number }): RecruitDirectoryRow {
  const p = person({ id, utr: tennis.utr, wtn: tennis.wtn, trnRank: tennis.trnRank });
  const profile: RecruitProfile = {
    id: `profile-${id}`,
    personId: id,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
  return {
    person: p,
    profile,
    analytics: {
      id,
      inPool: false,
    },
  };
}

test("recomputeDirectoryAnalytics scores the WTN pool from Person facts", () => {
  const rows = [
    row("a", { wtn: 20, utr: 10, trnRank: 50 }),
    row("b", { wtn: 22, utr: 11, trnRank: 40 }),
    row("c", { utr: 9 }),
  ];
  const next = recomputeDirectoryAnalytics(rows);
  assert.equal(next.find((item) => item.person.id === "a")?.analytics.inPool, true);
  assert.equal(next.find((item) => item.person.id === "b")?.analytics.inPool, true);
  assert.equal(next.find((item) => item.person.id === "c")?.analytics.inPool, false);
  assert.ok(next.find((item) => item.person.id === "a")?.analytics.tier);
});

test("replacePersonInCohort recomputes pool membership when WTN is added", () => {
  const cohort = [row("a", { utr: 10 }), row("b", { wtn: 21, utr: 11, trnRank: 30 })];
  const updated = person({
    id: "a",
    firstName: "Test",
    lastName: "Recruit",
    wtn: 19,
    utr: 10,
    trnRank: 80,
  });
  const next = replacePersonInCohort(cohort, "a", updated);
  assert.equal(next.find((item) => item.person.id === "a")?.analytics.inPool, true);
  assert.equal(next.find((item) => item.person.id === "a")?.person.wtn, 19);
});
