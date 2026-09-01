import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildUtrExtensionCaptureBody,
  isUtrCaptureAllowedPlayerId,
  utrCaptureErrorMessage,
} from "./utrCaptureErrors";
import { parseUtrPlayerIdFromUrl } from "./utrProfile";

const ISAAC_RESULTS_URL = "https://app.utrsports.net/profiles/3186547?t=2";
const OTHER_PROFILE_URL = "https://app.utrsports.net/profiles/9999999?t=2";

describe("UTR extension transport", () => {
  it("extracts Isaac UTR player id from profile URL", () => {
    assert.equal(parseUtrPlayerIdFromUrl(ISAAC_RESULTS_URL), "3186547");
    assert.equal(
      parseUtrPlayerIdFromUrl(
        "https://app.utrsports.net/profiles/3186547?dtenPersonId=recruit-xlsx-row-441",
      ),
      "3186547",
    );
  });

  it("rejects unknown UTR profile ids for v0.1", () => {
    assert.equal(isUtrCaptureAllowedPlayerId("3186547"), true);
    assert.equal(isUtrCaptureAllowedPlayerId("9999999"), false);
    assert.equal(
      isUtrCaptureAllowedPlayerId(parseUtrPlayerIdFromUrl(OTHER_PROFILE_URL) ?? ""),
      false,
    );
  });

  it("builds extension POST body with tennis payload only", () => {
    const payload = { events: [{ id: 1, name: "Test Event", results: [] }] };
    const body = buildUtrExtensionCaptureBody({
      utrPlayerId: "3186547",
      recruitPersonId: "recruit-xlsx-row-441",
      sourceUrl: ISAAC_RESULTS_URL,
      payload,
    });

    assert.equal(body.utrPlayerId, "3186547");
    assert.equal(body.recruitPersonId, "recruit-xlsx-row-441");
    assert.equal(body.sourceUrl, ISAAC_RESULTS_URL);
    assert.deepEqual(body.payload, payload);
    assert.equal(Object.keys(body).sort().join(","), "payload,recruitPersonId,sourceUrl,utrPlayerId");
  });

  it("maps Denison endpoint error codes to readable messages", () => {
    assert.match(utrCaptureErrorMessage("NOT_LOGGED_IN_UTR"), /Not logged into UTR/);
    assert.match(utrCaptureErrorMessage("WRONG_UTR_PROFILE"), /monitored Today Beta cohort/);
    assert.match(utrCaptureErrorMessage("DENISON_UNAVAILABLE"), /localhost:3000/);
    assert.match(utrCaptureErrorMessage("DENISON_NOT_SIGNED_IN"), /Sign in to Denison/);
    assert.match(utrCaptureErrorMessage("IMPORT_FAILED"), /could not save/);
  });
});
