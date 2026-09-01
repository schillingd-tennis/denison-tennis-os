import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { summarizeUtrAgentRun } from "./utrAgentRun";
import type { UtrAgentImportRecruitOutcome } from "./utrAgentImport";

function recruitOutcome(
  overrides: Partial<UtrAgentImportRecruitOutcome>,
): UtrAgentImportRecruitOutcome {
  return {
    recruitPersonId: "p1",
    displayName: "Isaac Lewis",
    acquisitionStatus: "OK",
    agentCheckStatus: "Checked",
    ...overrides,
  };
}

function importOutcome(overrides: Partial<NonNullable<UtrAgentImportRecruitOutcome["importOutcome"]>>) {
  return {
    found: 10,
    saved: 0,
    savedAsBaseline: 0,
    savedAsNew: 0,
    duplicatesIgnored: 0,
    crossSourceMatched: 7,
    needsReview: 0,
    baselineEstablished: true,
    savedResults: [],
    errors: [],
    ...overrides,
  };
}

describe("UTR Results Agent integration", () => {
  it("1. summarizes agent run counts", () => {
    const summary = summarizeUtrAgentRun({
      runId: "utr-1",
      startedAt: "2026-09-01T10:00:00.000Z",
      finishedAt: "2026-09-01T10:01:00.000Z",
      stoppedEarly: false,
      recruitRequests: [
        { recruitPersonId: "p1", displayName: "Isaac Lewis", utrPlayerId: "3186547" },
        { recruitPersonId: "p2", displayName: "Adam Roman", utrPlayerId: "4338036" },
      ],
      acquisitionByPersonId: new Map([
        ["p1", { matchesRead: 44, startedAt: "2026-09-01T10:00:00.000Z", finishedAt: "2026-09-01T10:00:30.000Z" }],
        ["p2", { matchesRead: 10, startedAt: "2026-09-01T10:00:31.000Z", finishedAt: "2026-09-01T10:01:00.000Z" }],
      ]),
      recruits: [
        recruitOutcome({
          recruitPersonId: "p1",
          importOutcome: importOutcome({
            found: 44,
            crossSourceMatched: 41,
          }),
        }),
        recruitOutcome({
          recruitPersonId: "p2",
          displayName: "Adam Roman",
          importOutcome: importOutcome({
            found: 10,
            savedAsNew: 3,
            crossSourceMatched: 7,
          }),
          agentCheckStatus: "New Results",
        }),
      ],
    });

    assert.equal(summary.totals.cohortSize, 2);
    assert.equal(summary.totals.recruitsChecked, 2);
    assert.equal(summary.totals.matchesRead, 54);
    assert.equal(summary.totals.matchesProcessed, 54);
    assert.equal(summary.totals.matchedExisting, 48);
    assert.equal(summary.totals.savedAsNew, 3);
    assert.equal(summary.totals.failed, 0);
    assert.equal(summary.recruitRows.length, 2);
  });

  it("2. missing UTR ID counts as not configured, not checked", () => {
    const summary = summarizeUtrAgentRun({
      runId: "utr-2",
      startedAt: "2026-09-01T10:00:00.000Z",
      finishedAt: "2026-09-01T10:00:30.000Z",
      stoppedEarly: false,
      recruitRequests: [{ recruitPersonId: "p1", displayName: "Isaac Lewis" }],
      acquisitionByPersonId: new Map(),
      recruits: [
        recruitOutcome({
          acquisitionStatus: "NOT_CONFIGURED",
          agentCheckStatus: "Not Configured",
          errorCode: "UTR_PROFILE_NOT_CONFIGURED",
        }),
      ],
    });

    assert.equal(summary.totals.notConfigured, 1);
    assert.equal(summary.totals.recruitsChecked, 0);
  });

  it("3. auth required counts as failed and stops early flag surfaces", () => {
    const summary = summarizeUtrAgentRun({
      runId: "utr-3",
      startedAt: "2026-09-01T10:00:00.000Z",
      finishedAt: "2026-09-01T10:00:05.000Z",
      stoppedEarly: true,
      stopReason: "AUTH_REQUIRED",
      recruitRequests: [{ recruitPersonId: "p1", displayName: "Isaac Lewis", utrPlayerId: "3186547" }],
      acquisitionByPersonId: new Map([
        ["p1", { matchesRead: 0, startedAt: "2026-09-01T10:00:00.000Z", finishedAt: "2026-09-01T10:00:05.000Z" }],
      ]),
      recruits: [
        recruitOutcome({
          acquisitionStatus: "AUTH_REQUIRED",
          agentCheckStatus: "Auth Required",
          errorCode: "AUTH_REQUIRED",
        }),
      ],
    });

    assert.equal(summary.totals.failed, 1);
    assert.equal(summary.totals.recruitsChecked, 0);
    assert.equal(summary.stopReason, "AUTH_REQUIRED");
  });

  it("4. failed acquisition does not increment recruitsChecked", () => {
    const summary = summarizeUtrAgentRun({
      runId: "utr-4",
      startedAt: "2026-09-01T10:00:00.000Z",
      finishedAt: "2026-09-01T10:00:10.000Z",
      stoppedEarly: false,
      recruitRequests: [{ recruitPersonId: "p1", displayName: "Isaac Lewis", utrPlayerId: "3186547" }],
      acquisitionByPersonId: new Map([
        ["p1", { matchesRead: 0, startedAt: "2026-09-01T10:00:00.000Z", finishedAt: "2026-09-01T10:00:10.000Z" }],
      ]),
      recruits: [
        recruitOutcome({
          acquisitionStatus: "UTR_PAGE_LOAD_FAILED",
          agentCheckStatus: "Failed",
          errorCode: "UTR_PAGE_LOAD_FAILED",
        }),
      ],
    });

    assert.equal(summary.totals.recruitsChecked, 0);
    assert.equal(summary.totals.failed, 1);
  });

  it("5. successful no-new-results check counts as checked", () => {
    const summary = summarizeUtrAgentRun({
      runId: "utr-5",
      startedAt: "2026-09-01T10:00:00.000Z",
      finishedAt: "2026-09-01T10:00:20.000Z",
      stoppedEarly: false,
      recruitRequests: [{ recruitPersonId: "p1", displayName: "Isaac Lewis", utrPlayerId: "3186547" }],
      acquisitionByPersonId: new Map([["p1", { matchesRead: 22 }]]),
      recruits: [
        recruitOutcome({
          agentCheckStatus: "Checked",
          importOutcome: importOutcome({
            found: 22,
            crossSourceMatched: 22,
          }),
        }),
      ],
    });

    assert.equal(summary.totals.recruitsChecked, 1);
    assert.equal(summary.totals.savedAsNew, 0);
  });

  it("6. needs review status surfaces when import has review items", () => {
    const summary = summarizeUtrAgentRun({
      runId: "utr-review",
      startedAt: "2026-09-01T10:00:00.000Z",
      finishedAt: "2026-09-01T10:00:20.000Z",
      stoppedEarly: false,
      recruitRequests: [{ recruitPersonId: "p1", displayName: "Isaac Lewis", utrPlayerId: "3186547" }],
      acquisitionByPersonId: new Map([["p1", { matchesRead: 22 }]]),
      recruits: [
        recruitOutcome({
          agentCheckStatus: "Needs Review",
          importOutcome: importOutcome({
            found: 22,
            needsReview: 2,
          }),
        }),
      ],
    });

    assert.equal(summary.recruitRows[0]?.status, "Needs Review");
    assert.equal(summary.totals.needsReview, 2);
  });

  it("7. five-player sequential mock aggregates per-recruit outcomes", () => {
    const names = [
      "Isaac Lewis",
      "Alexander Wriedt",
      "Finnegan Keenan",
      "Cole LaFors",
      "Adam Roman",
    ];
    const recruitRequests = names.map((displayName, index) => ({
      recruitPersonId: `p-${index}`,
      displayName,
      utrPlayerId: index === 4 ? undefined : `${1000 + index}`,
    }));
    const recruits = names.map((displayName, index) =>
      recruitOutcome({
        recruitPersonId: `p-${index}`,
        displayName,
        agentCheckStatus: index === 4 ? "Not Configured" : "Checked",
        acquisitionStatus: index === 4 ? "NOT_CONFIGURED" : "OK",
        importOutcome:
          index === 4
            ? undefined
            : importOutcome({
                found: 5,
                crossSourceMatched: 5,
              }),
      }),
    );

    const summary = summarizeUtrAgentRun({
      runId: "utr-five",
      startedAt: "2026-09-01T10:00:00.000Z",
      finishedAt: "2026-09-01T10:02:00.000Z",
      stoppedEarly: false,
      recruitRequests,
      acquisitionByPersonId: new Map(
        recruitRequests
          .filter((row) => row.utrPlayerId)
          .map((row) => [row.recruitPersonId, { matchesRead: 5 }]),
      ),
      recruits: recruits.filter((row) => row.agentCheckStatus !== "Not Configured"),
    });

    assert.equal(summary.recruitRows.length, 5);
    assert.equal(summary.totals.recruitsChecked, 4);
    assert.equal(summary.totals.notConfigured, 1);
    assert.equal(summary.totals.cohortSize, 5);
    assert.equal(summary.totals.configured, 4);
  });
});
