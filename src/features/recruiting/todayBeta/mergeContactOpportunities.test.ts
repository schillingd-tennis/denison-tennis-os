import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";
import { buildContactOpportunities } from "./contactOpportunityScore";
import { scoreCadenceOpportunity } from "./contactCadenceScore";
import { mergeContactOpportunities } from "./mergeContactOpportunities";
import { buildContactSuggestedText } from "./suggestedText";
import type { RecruitMatchResult } from "./types";

const PRIORITY_A = {
  id: "1",
  key: RECRUIT_PRIORITY_KEYS.elite,
  label: "1 - Elite",
};

function match(overrides: Partial<RecruitMatchResult> = {}): RecruitMatchResult {
  return {
    id: "m1",
    recruitPersonId: "p1",
    source: "trn_manual",
    result: "WIN",
    opponentName: "Test Opponent",
    opponentRanking: "75",
    tournamentName: "USTA L1",
    round: "QF",
    firstDetectedAt: "2026-08-31T12:00:00.000Z",
    lastVerifiedAt: "2026-08-31T12:00:00.000Z",
    detectionStatus: "NEW",
    resultFingerprint: "fp1",
    needsReview: false,
    parseWarnings: [],
    ...overrides,
  };
}

describe("mergeContactOpportunities", () => {
  it("merges result + cadence into one card", () => {
    const resultOpportunity = buildContactOpportunities({
      recruitPersonId: "isaac",
      recruitName: "Isaac Lewis",
      priority: PRIORITY_A,
      daysSinceLastContact: 12,
      matchResults: [match({ opponentRanking: "75" })],
    });
    const cadenceOpportunity = scoreCadenceOpportunity({
      priority: PRIORITY_A,
      daysSinceLastContact: 12,
    });

    const merged = mergeContactOpportunities({
      recruitPersonId: "isaac",
      recruitName: "Isaac Lewis",
      recruitFirstName: "Isaac",
      recruitPriorityLabel: "1 - Elite",
      daysSinceLastContact: 12,
      lastContactDateLabel: "Aug 19, 2026",
      resultOpportunity,
      cadenceOpportunity,
      tournamentOpportunity: null,
      newMatchResults: [match({ opponentRanking: "75" })],
    });

    assert.ok(merged);
    assert.deepEqual(merged.opportunityTypes, ["RESULT", "CADENCE"]);
    assert.equal(merged.opportunityTypeLabel, "Result + Cadence");
    assert.equal(merged.resultScore, 95);
    assert.equal(merged.cadenceScore, 60);
    assert.equal(merged.opportunityScore, 95);
    assert.ok(merged.factors.some((factor) => factor.reason.includes("Top 100")));
    assert.ok(merged.factors.some((factor) => factor.reason.includes("Last text/call was 12 days ago")));
  });

  it("shows cadence-only card when result score is below threshold", () => {
    const merged = mergeContactOpportunities({
      recruitPersonId: "finn",
      recruitName: "Finnegan Keenan",
      recruitFirstName: "Finn",
      recruitPriorityLabel: "1 - Elite",
      daysSinceLastContact: 11,
      lastContactDateLabel: "Aug 20, 2026",
      resultOpportunity: null,
      cadenceOpportunity: scoreCadenceOpportunity({
        priority: PRIORITY_A,
        daysSinceLastContact: 11,
      }),
      tournamentOpportunity: null,
    });

    assert.ok(merged);
    assert.deepEqual(merged.opportunityTypes, ["CADENCE"]);
    assert.equal(merged.opportunityScore, 60);
    assert.equal(merged.resultScore, null);
    assert.equal(merged.cadenceScore, 60);
    assert.equal(merged.matchResult, undefined);
  });

  it("returns null when neither pathway qualifies", () => {
    const merged = mergeContactOpportunities({
      recruitPersonId: "p1",
      recruitName: "Test",
      recruitPriorityLabel: "1 - Elite",
      daysSinceLastContact: 8,
      resultOpportunity: null,
      cadenceOpportunity: scoreCadenceOpportunity({
        priority: PRIORITY_A,
        daysSinceLastContact: 8,
      }),
      tournamentOpportunity: null,
    });
    assert.equal(merged, null);
  });
});

describe("buildContactSuggestedText priority", () => {
  it("prefers result-driven suggested text over cadence text", () => {
    const suggested = buildContactSuggestedText({
      recruitFirstName: "Isaac",
      matchResult: match({ opponentRanking: "75" }),
      newMatchResults: [match({ opponentRanking: "75" })],
      hasCadence: true,
      daysSinceLastContact: 12,
    });

    assert.equal(suggested.category, "strong_win");
    assert.match(suggested.text ?? "", /Great win today Isaac/);
  });

  it("uses cadence suggested text for cadence-only opportunities", () => {
    const suggested = buildContactSuggestedText({
      recruitFirstName: "Finn",
      hasCadence: true,
      daysSinceLastContact: 11,
    });

    assert.equal(suggested.category, "cadence_general");
    assert.equal(suggested.text, "Hey Finn, just checking in. How are things going?");
  });

  it("uses cadence_no_contact template when no contact history", () => {
    const suggested = buildContactSuggestedText({
      recruitFirstName: "Isaac",
      hasCadence: true,
      daysSinceLastContact: null,
    });

    assert.equal(suggested.category, "cadence_no_contact");
    assert.equal(
      suggested.text,
      "Hey Isaac, wanted to check in and see how things are going.",
    );
  });

  it("handles missing first name for cadence text", () => {
    const suggested = buildContactSuggestedText({
      recruitFirstName: "",
      hasCadence: true,
      daysSinceLastContact: 14,
    });

    assert.equal(suggested.text, "Hey, just checking in. How are things going?");
  });
});
