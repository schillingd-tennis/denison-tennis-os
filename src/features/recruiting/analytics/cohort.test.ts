import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPoolStats, computeRecruitingAnalytics } from "./engine";
import { subjectFromPerson } from "./fromPerson";
import cohort from "./fixtures/coda-analytics-cohort.json";
import type { RecruitAnalyticsResult } from "./types";

type Expected = (typeof cohort)[number]["expected"];

function missing(value: number | null | undefined): boolean {
  return value === null || value === undefined;
}

function nearlyEqual(actual: number, expected: number, maxAbs: number): boolean {
  return Math.abs(actual - expected) <= maxAbs + 1e-9;
}

function toSubjects() {
  return cohort.map((row, index) => ({
    id: `${index}:${row.name ?? "blank"}`,
    trnRank: row.trnRank,
    utr: row.utr,
    utrInvalid: row.name === "Enzo Badotti Cariani",
    wtn: row.wtn,
    matchesPlayed: row.matchesPlayed,
  }));
}

function mismatches(
  results: RecruitAnalyticsResult[],
  field: keyof Expected,
  opts: { maxAbs?: number } = {},
): string[] {
  const errors: string[] = [];
  for (let i = 0; i < cohort.length; i += 1) {
    const name = cohort[i].name ?? `row-${i}`;
    const expected = cohort[i].expected[field];
    const actual = results[i][field as keyof RecruitAnalyticsResult];
    if (missing(expected as number | null) && (actual === undefined || actual === null)) continue;
    if (typeof expected === "string") {
      if (actual !== expected) errors.push(`${name}: ${String(actual)} !== ${expected}`);
      continue;
    }
    if (typeof expected === "number" && typeof actual === "number") {
      const allowed = opts.maxAbs ?? 0;
      if (!nearlyEqual(actual, expected, allowed)) {
        errors.push(`${name}: ${actual} vs ${expected} (Δ ${Math.abs(actual - expected)})`);
      }
      continue;
    }
    errors.push(`${name}: ${String(actual)} vs ${String(expected)}`);
  }
  return errors;
}

describe("Coda analytics cohort (imported tennis facts)", () => {
  const subjects = toSubjects();
  const results = computeRecruitingAnalytics(subjects);
  const stats = buildPoolStats(subjects);

  it("defines the pool as WTN-present rows (n = 185)", () => {
    assert.equal(stats.size, 185);
    assert.equal(results.filter((row) => row.inPool).length, 185);
  });

  it("reproduces pool sample moments", () => {
    assert.equal(stats.trnCount, 180);
    assert.ok(Math.abs(stats.trnMean - 147.272222) < 1e-5);
    assert.ok(Math.abs(stats.trnSampleSd - 52.931476) < 1e-5);
    assert.ok(Math.abs(stats.utrMean - 10.835243) < 1e-5);
    assert.ok(Math.abs(stats.utrSampleSd - 0.445188) < 1e-5);
    assert.ok(Math.abs(stats.wtnMean - 22.391351) < 1e-5);
    assert.ok(Math.abs(stats.wtnSampleSd - 1.318485) < 1e-5);
  });

  it("matches CONFIRMED ranks and Z-scores exactly", () => {
    for (const field of ["wtnRank", "trRank", "utrRank", "trZ", "utrZ", "wtnZ", "reliability"] as const) {
      const errors = mismatches(results, field);
      assert.equal(errors.length, 0, `${field}: ${errors.slice(0, 8).join("; ")}`);
    }
  });

  it("matches observed Tier bands, including Core = Composite Z > -0.75", () => {
    const errors = mismatches(results, "tier");
    assert.equal(errors.length, 0, errors.slice(0, 8).join("; "));
  });

  it("keeps Weighted Score within the audited Coda residual (max 0.06)", () => {
    const errors = mismatches(results, "weightedScore", { maxAbs: 0.06 });
    assert.equal(errors.length, 0, errors.slice(0, 8).join("; "));
    let absSum = 0;
    let n = 0;
    for (let i = 0; i < cohort.length; i += 1) {
      const expected = cohort[i].expected.weightedScore;
      if (expected === null) continue;
      absSum += Math.abs((results[i].weightedScore ?? 0) - expected);
      n += 1;
    }
    assert.equal(n, 185);
    assert.ok(absSum / n < 0.012, `MAE ${absSum / n}`);
  });

  it("keeps Composite Z within 0.01 (Ryan Wang / Gianluca Galasso rounding)", () => {
    const errors = mismatches(results, "compositeZ", { maxAbs: 0.01 });
    assert.equal(errors.length, 0, errors.slice(0, 8).join("; "));
  });

  it("keeps Adjusted TR Rank within 0.01 of Coda (half-up vs engine round)", () => {
    const errors = mismatches(results, "adjustedTrRank", { maxAbs: 0.01 });
    assert.equal(errors.length, 0, errors.slice(0, 8).join("; "));
  });

  it("keeps Reliability Score within the Weighted Score residual band", () => {
    const errors = mismatches(results, "reliabilityScore", { maxAbs: 0.06 });
    assert.equal(errors.length, 0, errors.slice(0, 8).join("; "));
  });

  it("matches Composite Rank within 1 (WS rounding plus Zhang/Chabot 51 vs 52)", () => {
    const errors = mismatches(results, "compositeRank", { maxAbs: 1 });
    assert.equal(errors.length, 0, errors.slice(0, 8).join("; "));
    const zhang = results[cohort.findIndex((row) => row.name === "Justin Zhang")];
    const chabot = results[cohort.findIndex((row) => row.name === "Dante Chabot")];
    assert.equal(zhang.compositeRank, 51);
    assert.equal(chabot.compositeRank, 51);
  });

  it("maps Person tennis fields without creating Person columns", () => {
    const mapped = subjectFromPerson({
      id: "player-example",
      trnRank: 72,
      utr: 11.44,
      wtn: 20.4,
      utrMatchesPlayed: 29,
    });
    assert.deepEqual(mapped, {
      id: "player-example",
      trnRank: 72,
      utr: 11.44,
      wtn: 20.4,
      matchesPlayed: 29,
    });
  });
});
