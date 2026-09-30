import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractUtrRating } from "./checkTeamRating.js";

describe("UTR team rating extraction", () => {
  it("finds the requested player in nested profile JSON", () => {
    assert.equal(extractUtrRating({ player: { id: 3186547, singlesUtr: 11.426 } }, "3186547"), 11.43);
  });

  it("does not use an opponent rating", () => {
    assert.equal(extractUtrRating({ players: [{ id: 9, singlesUtr: 12.2 }] }, "3186547"), null);
  });

  it("rejects ratings outside the UTR range", () => {
    assert.equal(extractUtrRating({ id: 3186547, singlesUTR: 18 }, "3186547"), null);
  });
});
