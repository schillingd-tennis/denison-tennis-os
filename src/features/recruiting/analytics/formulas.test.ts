import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adjustedTrRank, mix304030, reliabilityRaw, reliabilityDisplayed, tierFromCompositeZ } from "./formulas";
import { competitionRank, round2, sampleMean, sampleSd } from "./math";
import { ADJUSTED_TR_RANK_CENTER } from "./types";

describe("recruiting analytics math", () => {
  it("uses sample standard deviation (n − 1)", () => {
    const values = [1, 2, 3];
    assert.equal(sampleMean(values), 2);
    assert.equal(sampleSd(values), 1);
  });

  it("competition-ranks ties at the minimum rank", () => {
    const universe = [10, 20, 20, 30];
    assert.equal(competitionRank(10, universe, "asc"), 1);
    assert.equal(competitionRank(20, universe, "asc"), 2);
    assert.equal(competitionRank(30, universe, "asc"), 4);
    assert.equal(competitionRank(11.5, [10.4, 11.5, 11.5], "desc"), 1);
  });

  it("rounds half away from zero to 2 decimals", () => {
    assert.equal(round2(1.425), 1.43);
    assert.equal(round2(-0.325), -0.33);
    assert.equal(round2(90.47778), 90.48);
  });
});

describe("audited Coda formulas", () => {
  it("mixes 30/40/30 and renormalizes when TR is missing", () => {
    assert.equal(mix304030(67, 56, 29), 51.2);
    assert.equal(mix304030(null, 39, 31), (0.4 * 39 + 0.3 * 31) / 0.7);
  });

  it("sets reliability to min(matches/30, 1) and blank matches to 1", () => {
    assert.equal(reliabilityRaw(null), 1);
    assert.equal(reliabilityRaw(undefined), 1);
    assert.equal(reliabilityRaw(0), 0);
    assert.equal(reliabilityRaw(29), 29 / 30);
    assert.equal(reliabilityDisplayed(29 / 30), 0.97);
    assert.equal(reliabilityRaw(88), 1);
  });

  it("shrinks TR Rank toward 90.48 using unrounded reliability", () => {
    assert.equal(round2(adjustedTrRank(108, 0)), ADJUSTED_TR_RANK_CENTER);
    assert.equal(round2(adjustedTrRank(140, 1)), 140);
    assert.equal(round2(adjustedTrRank(15, 29 / 30)), 17.52);
  });

  it("bands Tier with Core as Composite Z > -0.75", () => {
    assert.equal(tierFromCompositeZ(1.51), "1 - Elite");
    assert.equal(tierFromCompositeZ(0.75), "2 - Strong");
    assert.equal(tierFromCompositeZ(-0.3), "3 - Core");
    assert.equal(tierFromCompositeZ(-0.75), "4 - Fringe");
    assert.equal(tierFromCompositeZ(-1.53), "5 - Long Shot");
  });
});
