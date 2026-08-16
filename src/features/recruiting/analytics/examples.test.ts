import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRecruitingAnalytics } from "./engine";
import type { RecruitAnalyticsResult } from "./types";
import cohort from "./fixtures/coda-analytics-cohort.json";

function analyticsByName(): Map<string, RecruitAnalyticsResult> {
  const results = computeRecruitingAnalytics(
    cohort.map((row, index) => ({
      id: `${index}:${row.name ?? "blank"}`,
      trnRank: row.trnRank,
      utr: row.utr,
      utrInvalid: row.name === "Enzo Badotti Cariani",
      wtn: row.wtn,
      matchesPlayed: row.matchesPlayed,
    })),
  );
  const map = new Map<string, RecruitAnalyticsResult>();
  for (let i = 0; i < cohort.length; i += 1) {
    const name = cohort[i].name;
    if (name) map.set(name, results[i]);
  }
  return map;
}

const byName = analyticsByName();

function example(name: string): RecruitAnalyticsResult {
  const row = byName.get(name);
  if (!row) throw new Error(`Missing analytics for ${name}`);
  return row;
}

describe("known Coda examples", () => {
  it("scores Chase Gerloff inside the WTN pool (TRN 72)", () => {
    const row = example("Chase Gerloff");
    assert.equal(row.inPool, true);
    assert.equal(row.trRank, 15);
    assert.equal(row.trZ, 1.42);
    assert.equal(row.utrZ, 1.36);
    assert.equal(row.wtnZ, 1.51);
    assert.equal(row.weightedScore, 15.1);
    assert.equal(row.compositeRank, 13);
    assert.equal(row.compositeZ, 1.42);
    assert.equal(row.reliability, 0.97);
    assert.equal(row.adjustedTrRank, 17.52);
    assert.equal(row.reliabilityScore, 15.85);
    assert.equal(row.tier, "2 - Strong");
  });

  it("sets Alonso Berry reliability 0 and Adjusted TR Rank 90.48", () => {
    const row = example("Alonso Berry");
    assert.equal(row.reliability, 0);
    assert.equal(row.adjustedTrRank, 90.48);
    assert.equal(row.weightedScore, 109.6);
    assert.equal(row.reliabilityScore, 104.34);
    assert.equal(row.compositeZ, -0.3);
    assert.equal(row.tier, "3 - Core");
  });

  it("places Samuel Schumacher (Composite Z −0.75) in Fringe, not Core", () => {
    const row = example("Samuel Schumacher");
    assert.equal(row.compositeZ, -0.75);
    assert.equal(row.tier, "4 - Fringe");
  });

  it("keeps Jason Eigbedion outside the pool with TR Rank -1", () => {
    const row = example("Jason Eigbedion");
    assert.equal(row.inPool, false);
    assert.equal(row.trRank, -1);
    assert.equal(row.trZ, 1.8);
    assert.equal(row.adjustedTrRank, 90.48);
    assert.equal(row.weightedScore, undefined);
    assert.equal(row.tier, undefined);
  });

  it("renormalizes Weighted Score when pool TR Rank is blank", () => {
    const pietro = example("Pietro Sagone");
    const yusaku = example("Yusaku Harashima");
    assert.equal(pietro.trRank, undefined);
    assert.equal(yusaku.trRank, undefined);
    assert.ok(Math.abs((pietro.weightedScore ?? 0) - 32.15) <= 0.01);
    assert.ok(Math.abs((yusaku.weightedScore ?? 0) - 129.68) <= 0.04);
  });

  it("uses competition rank for the Nekrasov/Johnson Weighted Score tie", () => {
    const nekrasov = example("Maksim Nekrasov");
    const johnson = example("Elijah Johnson");
    assert.equal(nekrasov.compositeRank, 27);
    assert.equal(johnson.compositeRank, 27);
  });

  it("cannot recover Coda’s 51 vs 52 split of the 51.20 Weighted Score tie", () => {
    const zhang = example("Justin Zhang");
    const chabot = example("Dante Chabot");
    assert.equal(zhang.weightedScore, 51.2);
    assert.equal(chabot.weightedScore, 51.2);
    assert.equal(zhang.compositeRank, 51);
    assert.equal(chabot.compositeRank, 51);
  });

  it("marks the dirty Coda UTR string as UTR Rank -1 with no UTR Z", () => {
    const row = example("Enzo Badotti Cariani");
    assert.equal(row.utrRank, -1);
    assert.equal(row.utrZ, undefined);
  });
});
