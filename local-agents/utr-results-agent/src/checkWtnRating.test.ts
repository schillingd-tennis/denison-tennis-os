import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractSinglesWtn } from "./checkWtnRating.js";

describe("WTN rating extraction", () => {
  it("extracts the precise singles rating from a profile GraphQL payload", () => {
    const payload = {
      data: {
        person: {
          worldTennisNumbers: [
            { type: "SINGLE", tennisNumber: 11.66, confidence: 80 },
            { type: "DOUBLE", tennisNumber: 14.33, confidence: 50 },
          ],
        },
      },
    };
    assert.equal(extractSinglesWtn(payload), 11.66);
  });

  it("ignores doubles-only and invalid rating data", () => {
    assert.equal(extractSinglesWtn({ type: "DOUBLE", tennisNumber: 14.33 }), null);
    assert.equal(extractSinglesWtn({ type: "SINGLE", tennisNumber: 99 }), null);
  });
});
