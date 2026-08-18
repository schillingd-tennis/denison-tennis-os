import assert from "node:assert/strict";
import { test } from "node:test";

import { getNextSortState, sortItems } from "@/components/data-table/sorting";
import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";
import { EMPTY_VALUE } from "@/lib/formatting";

import type { RecruitAnalyticsResult } from "./analytics/types";
import type { RecruitDirectoryRow } from "./directory";
import {
  formatMetricsMatchesPlayed,
  formatMetricsReliability,
  formatMetricsScore,
  metricsDisplayRank,
  RECRUITING_METRICS_TABLE_COLUMNS,
} from "./directoryColumns";
import type { RecruitProfile } from "./types";

function person(
  partial: Partial<Person> & Pick<Person, "id">,
): Person {
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
  tennis: { utr?: number; wtn?: number; trnRank?: number; utrMatchesPlayed?: number },
  analytics: Partial<RecruitAnalyticsResult> = {},
  recruitClassYear?: number,
): RecruitDirectoryRow {
  const p = person({
    id,
    utr: tennis.utr,
    wtn: tennis.wtn,
    trnRank: tennis.trnRank,
    utrMatchesPlayed: tennis.utrMatchesPlayed,
  });
  const profile: RecruitProfile = {
    id: `profile-${id}`,
    personId: id,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    recruitClassYear,
  };
  return {
    person: p,
    profile,
    analytics: { id, inPool: analytics.inPool ?? false, ...analytics },
  };
}

test("metrics numeric columns first-click descending", () => {
  for (const id of [
    "utr",
    "wtn",
    "trnRank",
    "utrZ",
    "wtnZ",
    "trZ",
    "compositeZ",
    "weightedScore",
    "reliability",
    "reliabilityScore",
    "matchesPlayed",
  ] as const) {
    const column = RECRUITING_METRICS_TABLE_COLUMNS.find((entry) => entry.id === id);
    assert.ok(column, id);
    const first = getNextSortState(null, column);
    assert.deepEqual(first, { key: id, direction: "desc" });
    const second = getNextSortState(first, column);
    assert.deepEqual(second, { key: id, direction: "asc" });
  }
});

test("metrics class first-click ascending", () => {
  const column = RECRUITING_METRICS_TABLE_COLUMNS.find((entry) => entry.id === "recruitClassYear");
  assert.ok(column);
  const first = getNextSortState(null, column);
  assert.deepEqual(first, { key: "recruitClassYear", direction: "asc" });
});

test("metrics composite Z descending puts highest first and blanks last", () => {
  const high = row("high", {}, { compositeZ: 3.19 });
  const mid = row("mid", {}, { compositeZ: 1.1 });
  const blank = row("blank", {}, {});
  const sorted = sortItems(
    [blank, mid, high],
    { key: "compositeZ", direction: "desc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item) => item.person.id),
    ["high", "mid", "blank"],
  );
});

test("metrics composite Z ascending still keeps blanks last", () => {
  const high = row("high", {}, { compositeZ: 3.19 });
  const low = row("low", {}, { compositeZ: -0.4 });
  const blank = row("blank", {}, {});
  const sorted = sortItems(
    [high, blank, low],
    { key: "compositeZ", direction: "asc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item) => item.person.id),
    ["low", "high", "blank"],
  );
});

test("metrics UTR Z uses analytics.utrZ, not a stored Person field", () => {
  const a = row("a", { utr: 12 }, { utrZ: 1.2 });
  const b = row("b", { utr: 9 }, { utrZ: 3.1 });
  const sorted = sortItems(
    [a, b],
    { key: "utrZ", direction: "desc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item) => item.person.id),
    ["b", "a"],
  );
});

test("metrics reliability sorts by numeric value, not displayed percentage text", () => {
  const nine = row("nine", {}, { reliability: 0.09 });
  const ninety = row("ninety", {}, { reliability: 0.9 });
  const full = row("full", {}, { reliability: 1 });
  const blank = row("blank", {}, {});
  const sorted = sortItems(
    [nine, blank, full, ninety],
    { key: "reliability", direction: "desc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item) => item.person.id),
    ["full", "ninety", "nine", "blank"],
  );
});

test("metrics weighted score descending puts highest first and blanks last", () => {
  const high = row("high", {}, { weightedScore: 51.2 });
  const mid = row("mid", {}, { weightedScore: 15.1 });
  const blank = row("blank", {}, {});
  const sorted = sortItems(
    [blank, mid, high],
    { key: "weightedScore", direction: "desc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item) => item.person.id),
    ["high", "mid", "blank"],
  );
});

test("metrics reliability score ascending still keeps blanks last", () => {
  const high = row("high", {}, { reliabilityScore: 104.34 });
  const low = row("low", {}, { reliabilityScore: 15.85 });
  const blank = row("blank", {}, {});
  const sorted = sortItems(
    [high, blank, low],
    { key: "reliabilityScore", direction: "asc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item) => item.person.id),
    ["low", "high", "blank"],
  );
});

test("metrics display formatting matches Analytics workspace", () => {
  assert.equal(formatMetricsScore(15.1), "15.10");
  assert.equal(formatMetricsScore(104.34), "104.34");
  assert.equal(formatMetricsScore(undefined), EMPTY_VALUE);
  assert.equal(formatMetricsReliability(0.97), "97%");
  assert.equal(formatMetricsReliability(0), "0%");
  assert.equal(formatMetricsReliability(undefined), EMPTY_VALUE);
  assert.equal(formatMetricsMatchesPlayed(29), "29");
  assert.equal(formatMetricsMatchesPlayed(undefined), EMPTY_VALUE);
});

test("metrics matches played uses Person.utrMatchesPlayed and blanks last", () => {
  const high = row("high", { utrMatchesPlayed: 88 });
  const mid = row("mid", { utrMatchesPlayed: 29 });
  const blank = row("blank", {});
  const sorted = sortItems(
    [blank, mid, high],
    { key: "matchesPlayed", direction: "desc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item) => item.person.id),
    ["high", "mid", "blank"],
  );
});

test("metrics sortable column order places Matches Played after Class", () => {
  assert.deepEqual(
    RECRUITING_METRICS_TABLE_COLUMNS.map((column) => column.id),
    [
      "name",
      "recruitClassYear",
      "matchesPlayed",
      "utr",
      "wtn",
      "trnRank",
      "utrZ",
      "wtnZ",
      "trZ",
      "compositeZ",
      "weightedScore",
      "reliability",
      "reliabilityScore",
    ],
  );
});

test("metrics display rank is 1-based position in the current sort", () => {
  assert.equal(metricsDisplayRank(0), 1);
  assert.equal(metricsDisplayRank(9), 10);
  const high = row("high", {}, { compositeZ: 3.19 });
  const mid = row("mid", {}, { compositeZ: 1.1 });
  const blank = row("blank", {}, {});
  const sorted = sortItems(
    [blank, mid, high],
    { key: "compositeZ", direction: "desc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item, index) => `${metricsDisplayRank(index)}:${item.person.id}`),
    ["1:high", "2:mid", "3:blank"],
  );
});

test("metrics display rank follows UTR sort, not coachRank", () => {
  const low = row("low", { utr: 9 });
  low.profile.coachRank = 1;
  const high = row("high", { utr: 13 });
  high.profile.coachRank = 99;
  const desc = sortItems(
    [low, high],
    { key: "utr", direction: "desc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    desc.map((item, index) => `${metricsDisplayRank(index)}:${item.person.id}`),
    ["1:high", "2:low"],
  );
  const asc = sortItems(
    [high, low],
    { key: "utr", direction: "asc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    asc.map((item, index) => `${metricsDisplayRank(index)}:${item.person.id}`),
    ["1:low", "2:high"],
  );
});

test("metrics display rank is 1…N of the current found set", () => {
  const foundSet = [
    row("a", { utr: 11 }),
    row("b", { utr: 13 }),
    row("c", { utr: 10 }),
  ];
  const sorted = sortItems(
    foundSet,
    { key: "utr", direction: "desc" },
    RECRUITING_METRICS_TABLE_COLUMNS,
  );
  assert.deepEqual(
    sorted.map((item, index) => metricsDisplayRank(index)),
    [1, 2, 3],
  );
  assert.equal(sorted.length, foundSet.length);
});
