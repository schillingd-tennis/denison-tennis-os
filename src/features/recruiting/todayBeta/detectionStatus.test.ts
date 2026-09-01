import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";
import {
  buildContactOpportunities,
  scoreMatchResultOpportunity,
} from "./contactOpportunityScore";
import {
  detectionStatusForImport,
  filterNewResultsFeed,
  isBaselineEstablished,
  planMatchResultImport,
} from "./detectionStatus";
import type { RecruitMatchResult } from "./types";

const NOW = new Date("2026-08-31T18:00:00.000Z");

function match(overrides: Partial<RecruitMatchResult> = {}): RecruitMatchResult {
  return {
    id: "m1",
    recruitPersonId: "p1",
    source: "trn_manual",
    result: "WIN",
    opponentName: "Ezra Smith",
    opponentRanking: "82",
    score: "6-4 6-3",
    tournamentName: "USTA L1",
    round: "Quarterfinal",
    firstDetectedAt: "2026-08-30T12:00:00.000Z",
    lastVerifiedAt: "2026-08-30T12:00:00.000Z",
    detectionStatus: "NEW",
    resultFingerprint: "fp1",
    needsReview: false,
    parseWarnings: [],
    ...overrides,
  };
}

describe("detectionStatus", () => {
  it("first import establishes baseline", () => {
    assert.equal(detectionStatusForImport(false), "BASELINE");
    assert.equal(isBaselineEstablished({ trn: { playerId: "1", profileUrl: "x" } }), false);

    const plan = planMatchResultImport({
      baselineEstablished: false,
      existingFingerprints: new Set(),
      rowFingerprints: ["a", "b", "c"],
    });

    assert.equal(plan.establishesBaseline, true);
    assert.deepEqual(
      plan.plans.map((row) => row.detectionStatus),
      ["BASELINE", "BASELINE", "BASELINE"],
    );
  });

  it("baseline matches do not appear in New Results", () => {
    const feed = filterNewResultsFeed(
      [
        match({ id: "baseline", detectionStatus: "BASELINE" }),
        match({ id: "new", detectionStatus: "NEW" }),
      ],
      { windowDays: 7, now: NOW },
    );

    assert.deepEqual(feed.map((row) => row.id), ["new"]);
  });

  it("re-importing the same matches creates no new records", () => {
    const existing = new Set(["fp1", "fp2", "fp3"]);
    const plan = planMatchResultImport({
      baselineEstablished: true,
      existingFingerprints: existing,
      rowFingerprints: ["fp1", "fp2", "fp3"],
    });

    assert.deepEqual(
      plan.plans.map((row) => row.detectionStatus),
      [null, null, null],
    );
    assert.equal(plan.establishesBaseline, false);
  });

  it("a subsequent import with one additional match saves only that match as NEW", () => {
    const plan = planMatchResultImport({
      baselineEstablished: true,
      existingFingerprints: new Set(["fp1", "fp2", "fp3"]),
      rowFingerprints: ["fp1", "fp2", "fp3", "fp4"],
    });

    assert.deepEqual(
      plan.plans.map((row) => row.detectionStatus),
      [null, null, null, "NEW"],
    );
  });

  it("Day 2 scenario: 9 baseline fingerprints plus 1 new fingerprint", () => {
    const baselineFingerprints = Array.from({ length: 9 }, (_, index) => `baseline-${index}`);
    const plan = planMatchResultImport({
      baselineEstablished: true,
      existingFingerprints: new Set(baselineFingerprints),
      rowFingerprints: [...baselineFingerprints, "synthetic-new"],
    });

    assert.equal(plan.plans.filter((row) => row.detectionStatus === null).length, 9);
    assert.equal(plan.plans.filter((row) => row.detectionStatus === "NEW").length, 1);
    assert.equal(plan.establishesBaseline, false);
  });

  it("second identical Day 2 import inserts nothing", () => {
    const fingerprints = Array.from({ length: 10 }, (_, index) => `fp-${index}`);
    const plan = planMatchResultImport({
      baselineEstablished: true,
      existingFingerprints: new Set(fingerprints),
      rowFingerprints: fingerprints,
    });

    assert.deepEqual(
      plan.plans.map((row) => row.detectionStatus),
      Array.from({ length: 10 }, () => null),
    );
  });
});

describe("contactOpportunityScore with detection status", () => {
  it("baseline matches do not receive New Result scoring bonus", () => {
    const { score, factors } = scoreMatchResultOpportunity({
      matchResult: match({ detectionStatus: "BASELINE" }),
      priority: { id: "1", key: RECRUIT_PRIORITY_KEYS.elite, label: "1 - Elite" },
      daysSinceLastContact: 9,
      now: NOW,
    });

    assert.equal(score, 85);
    assert.equal(
      factors.some((factor) => factor.key === "new_result"),
      false,
    );
  });

  it("newly discovered match appears in New Results feed", () => {
    const feed = filterNewResultsFeed([match({ id: "fresh", detectionStatus: "NEW" })], {
      windowDays: 7,
      now: NOW,
    });

    assert.equal(feed.length, 1);
    assert.equal(feed[0]?.id, "fresh");
  });

  it("newly discovered match can create a Contact Today opportunity", () => {
    const opportunity = buildContactOpportunities({
      recruitPersonId: "p1",
      recruitName: "Isaac Lewis",
      priority: { id: "1", key: RECRUIT_PRIORITY_KEYS.elite, label: "1 - Elite" },
      daysSinceLastContact: 9,
      matchResults: [
        match({ id: "baseline", detectionStatus: "BASELINE", opponentRanking: "37" }),
        match({ id: "new", detectionStatus: "NEW", opponentRanking: "82" }),
      ],
      now: NOW,
    });

    assert.equal(opportunity?.matchResult.id, "new");
    assert.equal(opportunity?.opportunityScore, 95);
    assert.equal(
      opportunity?.factors.some((factor) => factor.key === "new_result"),
      true,
    );
  });

  it("baseline-only results do not create Contact Today opportunities", () => {
    const opportunity = buildContactOpportunities({
      recruitPersonId: "p1",
      recruitName: "Alexander Wriedt",
      priority: { id: "1", key: RECRUIT_PRIORITY_KEYS.elite, label: "1 - Elite" },
      daysSinceLastContact: 9,
      matchResults: [match({ detectionStatus: "BASELINE", opponentRanking: "37" })],
      now: NOW,
    });

    assert.equal(opportunity, null);
  });
});
