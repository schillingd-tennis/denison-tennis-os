import assert from "node:assert/strict";
import { test } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import type { RecruitDirectoryRow } from "./directory";
import { compareUnrankedRows } from "./rankViewSort";
import type { RecruitProfile } from "./types";

function person(partial: Partial<Person> & Pick<Person, "id">): Person {
  return {
    firstName: partial.id,
    lastName: "Test",
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

function row(
  id: string,
  tennis: { utr?: number; wtn?: number; trnRank?: number },
): RecruitDirectoryRow {
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
    analytics: { id, inPool: false },
  };
}

test("unranked default UTR desc puts highest first", () => {
  const a = row("a", { utr: 10 });
  const b = row("b", { utr: 12 });
  const c = row("c", { utr: 11 });
  const sorted = [a, b, c].sort((x, y) => compareUnrankedRows(x, y, "utr", "desc"));
  assert.deepEqual(
    sorted.map((r) => r.person.id),
    ["b", "c", "a"],
  );
});

test("unranked UTR sort places missing UTR last", () => {
  const high = row("high", { utr: 12 });
  const low = row("low", { utr: 9 });
  const missing = row("missing", {});
  const sortedDesc = [missing, low, high].sort((x, y) =>
    compareUnrankedRows(x, y, "utr", "desc"),
  );
  assert.equal(sortedDesc.at(-1)?.person.id, "missing");
  const sortedAsc = [missing, high, low].sort((x, y) =>
    compareUnrankedRows(x, y, "utr", "asc"),
  );
  assert.equal(sortedAsc.at(-1)?.person.id, "missing");
});

test("unranked outcome sort uses lookup order and puts missing last", () => {
  const denison: RecruitDirectoryRow = {
    ...row("denison", {}),
    profile: {
      ...row("denison", {}).profile,
      outcome: { id: "o1", key: "committed_denison", label: "Committed to Denison" },
    },
  };
  const elsewhere: RecruitDirectoryRow = {
    ...row("elsewhere", {}),
    profile: {
      ...row("elsewhere", {}).profile,
      outcome: { id: "o2", key: "committed_elsewhere", label: "Committed Elsewhere" },
    },
  };
  const none = row("none", {});
  const sorted = [none, elsewhere, denison].sort((x, y) =>
    compareUnrankedRows(x, y, "outcome", "asc"),
  );
  assert.deepEqual(
    sorted.map((r) => r.person.id),
    ["denison", "elsewhere", "none"],
  );
});
