import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseExternalPlayerId } from "./repository";

describe("team rating profiles", () => {
  it("extracts a stable UTR player id", () => {
    assert.equal(parseExternalPlayerId("utr", "https://app.utrsports.net/profiles/3186547?t=2"), "3186547");
  });

  it("does not guess an id from an invalid UTR URL", () => {
    assert.equal(parseExternalPlayerId("utr", "https://app.utrsports.net/search"), null);
  });
});
