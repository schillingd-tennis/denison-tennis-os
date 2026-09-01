import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyAcquisition,
  sanitizeRequestUrl,
  sanitizeResponseBody,
  summarizeResponseBody,
} from "./diagnostics.js";

describe("UTR agent diagnostics", () => {
  it("1. auth values are never included in sanitized logs", () => {
    const raw =
      'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token cookie=abc; jwt=secret password=hunter2';
    const sanitized = sanitizeResponseBody(raw);
    assert.equal(sanitized, "[redacted]");
  });

  it("2. sensitive query params are redacted from request URLs", () => {
    const url = sanitizeRequestUrl(
      "https://api.utrsports.net/v4/player/3186547/results?type=singles&access_token=secret&auth=abc",
    );
    assert.match(url, /access_token=(\[redacted\]|%5Bredacted%5D)/);
    assert.match(url, /auth=(\[redacted\]|%5Bredacted%5D)/);
    assert.doesNotMatch(url, /secret/);
  });

  it("3. 400 response logs status + safe body summary", () => {
    const summary = summarizeResponseBody(
      JSON.stringify({ message: "Token is missing", statusCode: 400 }),
    );
    assert.equal(summary, "Token is missing");

    const classified = classifyAcquisition({
      signInGateVisible: false,
      profileLoaded: true,
      pageRequestObserved: true,
      pageRequestStatus: 400,
      pageRequestJsonCaptured: false,
      pageRequestBodySummary: summary,
      fallbackAttempted: false,
      matchesRead: 0,
    });

    assert.equal(classified.diagnosticStatus, "AUTH_REQUIRED");
    assert.match(classified.message, /Token is missing/);
  });

  it("4. missing page request produces PROFILE_LOADED_RESULTS_REQUEST_NOT_SEEN", () => {
    const classified = classifyAcquisition({
      signInGateVisible: false,
      profileLoaded: true,
      pageRequestObserved: false,
      fallbackAttempted: false,
      matchesRead: 0,
    });

    assert.equal(classified.diagnosticStatus, "PROFILE_LOADED_RESULTS_REQUEST_NOT_SEEN");
  });

  it("5. parse failure produces UTR_RESULTS_PARSE_FAILED", () => {
    const classified = classifyAcquisition({
      signInGateVisible: false,
      profileLoaded: true,
      pageRequestObserved: true,
      pageRequestStatus: 200,
      pageRequestJsonCaptured: false,
      pageRequestBodySummary: "<html>not json</html>",
      fallbackAttempted: false,
      matchesRead: 0,
    });

    assert.equal(classified.diagnosticStatus, "UTR_RESULTS_PARSE_FAILED");
  });

  it("6. successful response produces UTR_RESULTS_SUCCESS", () => {
    const classified = classifyAcquisition({
      signInGateVisible: false,
      profileLoaded: true,
      pageRequestObserved: true,
      pageRequestStatus: 200,
      pageRequestJsonCaptured: true,
      fallbackAttempted: false,
      matchesRead: 9,
    });

    assert.equal(classified.diagnosticStatus, "UTR_RESULTS_SUCCESS");
  });

  it("7. fallback HTTP error surfaces bearer-token hint safely", () => {
    const classified = classifyAcquisition({
      signInGateVisible: false,
      profileLoaded: true,
      pageRequestObserved: false,
      fallbackAttempted: true,
      fallbackStatus: 400,
      fallbackJsonCaptured: false,
      fallbackBodySummary: "Token is missing",
      matchesRead: 0,
    });

    assert.equal(classified.diagnosticStatus, "AUTH_REQUIRED");
  });

  it("8. fallback HTTP 400 with parseable JSON is not treated as empty success", () => {
    const classified = classifyAcquisition({
      signInGateVisible: false,
      profileLoaded: true,
      pageRequestObserved: false,
      fallbackAttempted: true,
      fallbackStatus: 400,
      fallbackJsonCaptured: true,
      fallbackBodySummary: "Type must be singles or doubles",
      matchesRead: 0,
    });

    assert.equal(classified.diagnosticStatus, "UTR_RESULTS_HTTP_ERROR");
  });
});
