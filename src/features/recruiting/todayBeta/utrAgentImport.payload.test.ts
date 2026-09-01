import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { validateUtrAgentImportPayload } from "./utrAgentImport";
import {
  countImportableUtrPayloadMatches,
  countRawUtrPayloadMatches,
  isUtrApiErrorEnvelope,
  isUtrResultsPayload,
  summarizeUtrPayload,
} from "./utrPayloadDiagnostics";

const here = dirname(fileURLToPath(import.meta.url));
const isaacSamplePath = join(here, "../../../../.local/isaac-utr-payload-sample.json");

describe("UTR browser-mediated import payload", () => {
  it("1. valid UTR payload is recognized and counted", () => {
    const payload = JSON.parse(readFileSync(isaacSamplePath, "utf8")) as unknown;
    assert.equal(isUtrResultsPayload(payload), true);
    assert.ok(countRawUtrPayloadMatches(payload) > 0);
    assert.ok(countImportableUtrPayloadMatches(payload) > 0);
  });

  it("2. UTR API error envelopes are not treated as results payloads", () => {
    const errorPayload = {
      StatusCode: 400,
      Message: "Bad request",
      DisplayMessage: "Type must be singles or doubles",
    };
    assert.equal(isUtrApiErrorEnvelope(errorPayload), true);
    assert.equal(isUtrResultsPayload(errorPayload), false);
  });

  it("3. agent matchesRead=89 with missing payload returns IMPORT_PAYLOAD_MISSING", () => {
    const validation = validateUtrAgentImportPayload({
      status: "OK",
      utrPlayerId: "3186547",
      matchesRead: 89,
      payload: {
        StatusCode: 400,
        Message: "Exception",
        DisplayMessage: "Type must be singles or doubles",
      },
    });

    assert.equal(validation.ok, false);
    if (!validation.ok) {
      assert.equal(validation.errorCode, "IMPORT_PAYLOAD_MISSING");
    }
  });

  it("4. agent matchesRead=0 with valid empty payload is allowed", () => {
    const validation = validateUtrAgentImportPayload({
      status: "OK",
      utrPlayerId: "3186547",
      matchesRead: 0,
      payload: { events: [], wins: 0, losses: 0 },
    });

    assert.equal(validation.ok, true);
    if (validation.ok) {
      assert.equal(validation.importableMatchCount, 0);
    }
  });

  it("5. summarizeUtrPayload reports safe structure without auth data", () => {
    const payload = JSON.parse(readFileSync(isaacSamplePath, "utf8")) as unknown;
    const summary = summarizeUtrPayload(payload);
    assert.equal(summary.payloadPresent, true);
    assert.equal(summary.isValidUtrResults, true);
    assert.ok(summary.eventsCount > 0);
    assert.ok(summary.rawMatchCount > 0);
    assert.ok(summary.topLevelKeys.includes("events"));
  });

  it("6. browser-mediated agent recruit type preserves payload field", () => {
    const browserClientSource = readFileSync(join(here, "utrAgentBrowserClient.ts"), "utf8");
    const agentTypesSource = readFileSync(
      join(here, "../../../../local-agents/utr-results-agent/src/types.ts"),
      "utf8",
    );
    assert.match(browserClientSource, /recruits: body\.recruits/);
    assert.match(agentTypesSource, /payload\?: unknown/);
  });
});
