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

  it("extracts a WTN player id from the public profile URL", () => {
    assert.equal(
      parseExternalPlayerId("wtn", "https://worldtennisnumber.com/eng/player-profile?id=61947e4e40b7f25e922d7a3f"),
      "61947e4e40b7f25e922d7a3f",
    );
  });
});
