import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";
import {
  buildContactOpportunities,
  scoreMatchResultOpportunity,
} from "./contactOpportunityScore";
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

describe("contactOpportunityScore", () => {
  it("scores a strong win with priority and stale contact", () => {
    const { score, factors } = scoreMatchResultOpportunity({
      matchResult: match(),
      priority: { id: "1", key: RECRUIT_PRIORITY_KEYS.elite, label: "1 - Elite" },
      daysSinceLastContact: 9,
      now: NOW,
    });

    assert.equal(score, 95);
    assert.deepEqual(
      factors.map((factor) => factor.reason),
      [
        "Recent win",
        "Beat a Top 100 opponent",
        "Priority A recruit",
        "9 days since last contact",
        "New result",
      ],
    );
  });

  it("uses 0 priority points when priority is missing", () => {
    const { score } = scoreMatchResultOpportunity({
      matchResult: match({ opponentRanking: "350" }),
      daysSinceLastContact: null,
      now: NOW,
    });

    assert.equal(score, 25);
  });

  it("picks the highest-scoring newly detected result for a recruit", () => {
    const opportunity = buildContactOpportunities({
      recruitPersonId: "p1",
      recruitName: "Isaac Lewis",
      priority: { id: "1", key: RECRUIT_PRIORITY_KEYS.elite, label: "1 - Elite" },
      daysSinceLastContact: 9,
      matchResults: [
        match({
          id: "old",
          detectionStatus: "NEW",
          opponentRanking: "400",
          firstDetectedAt: "2026-08-01T12:00:00.000Z",
        }),
        match({ id: "best", detectionStatus: "NEW", opponentRanking: "82" }),
      ],
      now: NOW,
    });

    assert.equal(opportunity?.matchResult.id, "best");
    assert.equal(opportunity?.opportunityScore, 95);
  });
});
