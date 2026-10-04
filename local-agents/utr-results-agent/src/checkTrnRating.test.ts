import assert from "node:assert/strict";
import test from "node:test";

import { extractTrnRating } from "./checkTrnRating.js";

test("extracts TennisRecruiting.net national rank and star rating", () => {
  assert.deepEqual(extractTrnRating("National Rank: #42 · 5-Star recruit"), {
    rank: 42,
    starRating: 5,
  });
});

test("maps Blue Chip recruits to the existing six-star value", () => {
  assert.deepEqual(extractTrnRating("National Ranking 7 Blue Chip"), {
    rank: 7,
    starRating: 6,
  });
});
