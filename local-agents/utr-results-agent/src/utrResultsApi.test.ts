import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildUtrResultsApiUrl,
  isUtrPlayerResultsRequestUrl,
  UTR_RESULTS_API_QUERY,
} from "./utrResultsApi.js";
import { classifyAcquisition } from "./diagnostics.js";

const here = dirname(fileURLToPath(import.meta.url));
const checkRecruitSource = readFileSync(join(here, "checkRecruit.ts"), "utf8");

describe("UTR results API shape", () => {
  it("1. uses live frontend query type=s&year=last", () => {
    assert.equal(UTR_RESULTS_API_QUERY, "type=s&year=last");
    const url = buildUtrResultsApiUrl("3186547");
    assert.match(url, /type=s&year=last/);
    assert.doesNotMatch(url, /type=singles/);
  });

  it("2. fallback URL contains required query parameters", () => {
    const url = buildUtrResultsApiUrl("3186547");
    assert.equal(
      url,
      "https://api.utrsports.net/v4/player/3186547/results?type=s&year=last",
    );
    assert.equal(isUtrPlayerResultsRequestUrl(url, "3186547"), true);
  });

  it("3. HTTP 400 remains UTR_RESULTS_HTTP_ERROR", () => {
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

  it("4. page request listener is installed before navigation", () => {
    const waitIndex = checkRecruitSource.indexOf("waitForPlayerResultsResponse");
    const gotoIndex = checkRecruitSource.indexOf("page.goto(");
    assert.ok(waitIndex >= 0);
    assert.ok(gotoIndex >= 0);
    assert.ok(waitIndex < gotoIndex);
    assert.match(checkRecruitSource, /waitForResponse/);
  });

  it("5. fallback mirrors live frontend URL", () => {
    assert.match(checkRecruitSource, /buildUtrResultsApiUrl/);
    assert.doesNotMatch(checkRecruitSource, /type=singles/);
  });

  it("6. error envelope cannot produce OK via classifyAcquisition", () => {
    const classified = classifyAcquisition({
      signInGateVisible: false,
      profileLoaded: true,
      pageRequestObserved: false,
      fallbackAttempted: true,
      fallbackStatus: 400,
      fallbackJsonCaptured: true,
      fallbackBodySummary: "BadRequestException",
      matchesRead: 0,
    });
    assert.notEqual(classified.diagnosticStatus, "UTR_RESULTS_SUCCESS");
    assert.notEqual(classified.diagnosticStatus, "UTR_RESULTS_EMPTY");
  });
});

describe("UTR agent server process", () => {
  it("7. server remains listening after handling a request", () => {
    const serverSource = readFileSync(join(here, "server.ts"), "utf8");
    assert.match(serverSource, /server\.listen\(/);
    assert.doesNotMatch(serverSource, /process\.exit\(0\)/);
  });
});
