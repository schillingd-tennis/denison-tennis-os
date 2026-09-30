import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractPower6 } from "./checkTeamPower6.js";

describe("Denison Power 6 extraction", () => {
  it("reads the value shown before the Power 6 label", () => {
    assert.equal(extractPower6("Ranked #4 | Men's D3 | NCAC | 68.17 Power 6"), 68.17);
  });

  it("accepts a value displayed after the label", () => {
    assert.equal(extractPower6("Power 6 67.845"), 67.85);
  });

  it("does not invent a value from unrelated team text", () => {
    assert.equal(extractPower6("Denison University Ranked #4"), null);
  });
});
