import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";
import { scoreCadenceOpportunity } from "./contactCadenceScore";
import { CADENCE_CONTACT_TODAY_MIN_SCORE } from "./contactCadenceConfig";

const PRIORITY_A = {
  id: "1",
  key: RECRUIT_PRIORITY_KEYS.elite,
  label: "1 - Elite",
};

const PRIORITY_B = {
  id: "2",
  key: RECRUIT_PRIORITY_KEYS.significant,
  label: "2 - Significant",
};

const PRIORITY_C = {
  id: "3",
  key: RECRUIT_PRIORITY_KEYS.potential,
  label: "3 - Potential",
};

describe("contactCadenceScore", () => {
  it("Priority A, contacted 5 days ago → no cadence opportunity", () => {
    assert.equal(scoreCadenceOpportunity({ priority: PRIORITY_A, daysSinceLastContact: 5 }), null);
  });

  it("Priority A, contacted 8 days ago → score 40, below threshold", () => {
    const scored = scoreCadenceOpportunity({ priority: PRIORITY_A, daysSinceLastContact: 8 });
    assert.equal(scored?.cadenceScore, 40);
    assert.ok(scored!.cadenceScore < CADENCE_CONTACT_TODAY_MIN_SCORE);
  });

  it("Priority A, contacted 11 days ago → score 60", () => {
    const scored = scoreCadenceOpportunity({ priority: PRIORITY_A, daysSinceLastContact: 11 });
    assert.equal(scored?.cadenceScore, 60);
    assert.ok(scored!.cadenceScore >= CADENCE_CONTACT_TODAY_MIN_SCORE);
  });

  it("Priority A, contacted 15 days ago → score 80", () => {
    assert.equal(
      scoreCadenceOpportunity({ priority: PRIORITY_A, daysSinceLastContact: 15 })?.cadenceScore,
      80,
    );
  });

  it("Priority B, contacted 11 days ago → score 40, below threshold", () => {
    const scored = scoreCadenceOpportunity({ priority: PRIORITY_B, daysSinceLastContact: 11 });
    assert.equal(scored?.cadenceScore, 40);
    assert.ok(scored!.cadenceScore < CADENCE_CONTACT_TODAY_MIN_SCORE);
  });

  it("Priority B, contacted 16 days ago → score 60", () => {
    assert.equal(
      scoreCadenceOpportunity({ priority: PRIORITY_B, daysSinceLastContact: 16 })?.cadenceScore,
      60,
    );
  });

  it("Priority B, contacted 22 days ago → score 80", () => {
    assert.equal(
      scoreCadenceOpportunity({ priority: PRIORITY_B, daysSinceLastContact: 22 })?.cadenceScore,
      80,
    );
  });

  it("Priority A with no contact history → score 80", () => {
    const scored = scoreCadenceOpportunity({ priority: PRIORITY_A, daysSinceLastContact: null });
    assert.equal(scored?.cadenceScore, 80);
    assert.equal(scored?.factors[0]?.reason, "No text or call logged");
  });

  it("Priority B with no contact history → score 60", () => {
    assert.equal(
      scoreCadenceOpportunity({ priority: PRIORITY_B, daysSinceLastContact: null })?.cadenceScore,
      60,
    );
  });

  it("Lower-priority recruit with no contact history → no cadence opportunity", () => {
    assert.equal(
      scoreCadenceOpportunity({ priority: PRIORITY_C, daysSinceLastContact: null }),
      null,
    );
  });
});
