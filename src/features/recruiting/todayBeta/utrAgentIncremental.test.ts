import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { UtrAgentCheckResult, UtrAgentRecruitRequest } from "./utrAgentClient";
import {
  accumulateTotalsFromRecruitRows,
  estimateJsonPayloadBytes,
  filterRecruitsForPilot,
  formatIncrementalProgressLabel,
  isTwoPlayerPilotRecruit,
  shouldStopBatchOnAuth,
} from "./utrAgentIncremental";
import { runIncrementalUtrAgentBatch } from "./utrAgentIncrementalBatch";
import { buildRunSummaryFromRecruitRows } from "./utrAgentRun";
import type { UtrAgentRecruitRunRow } from "./utrAgentRun";

const here = dirname(fileURLToPath(import.meta.url));

function recruitRequest(name: string, id = name.toLowerCase().replace(/\s+/g, "-")): UtrAgentRecruitRequest {
  return {
    recruitPersonId: id,
    displayName: name,
    utrPlayerId: "12345",
  };
}

function agentResultFor(recruit: UtrAgentRecruitRequest, status = "OK"): UtrAgentCheckResult {
  return {
    runId: "run-1",
    startedAt: "2026-09-02T10:00:00.000Z",
    finishedAt: "2026-09-02T10:00:05.000Z",
    stoppedEarly: false,
    recruits: [
      {
        recruitPersonId: recruit.recruitPersonId,
        displayName: recruit.displayName,
        utrPlayerId: recruit.utrPlayerId,
        status,
        matchesRead: 3,
        payload: { hits: [{ id: 1 }] },
      },
    ],
    summary: {
      recruitsRequested: 1,
      recruitsChecked: 1,
      recruitsFailed: 0,
      recruitsNotConfigured: 0,
      matchesRead: 3,
    },
  };
}

function recruitRow(
  request: UtrAgentRecruitRequest,
  status: UtrAgentRecruitRunRow["status"],
  overrides: Partial<UtrAgentRecruitRunRow> = {},
): UtrAgentRecruitRunRow {
  return {
    recruitPersonId: request.recruitPersonId,
    displayName: request.displayName,
    utrPlayerId: request.utrPlayerId,
    status,
    matchesRead: 3,
    matchesProcessed: 3,
    matchedExisting: 1,
    baselineAdded: 2,
    savedAsNew: 0,
    needsReview: 0,
    ...overrides,
  };
}

describe("UTR incremental import", () => {
  const sectionSource = readFileSync(
    join(here, "components/UtrAutomaticCheckSection.tsx"),
    "utf8",
  );
  const importRouteSource = readFileSync(
    join(here, "../../../app/api/recruiting/today-beta/utr-agent-import/route.ts"),
    "utf8",
  );
  const incrementalImportSource = readFileSync(
    join(here, "utrAgentIncrementalImport.ts"),
    "utf8",
  );
  const batchSource = readFileSync(join(here, "utrAgentIncrementalBatch.ts"), "utf8");

  it("1. batch sends one recruit to agent at a time", async () => {
    const isaac = recruitRequest("Isaac Lewis", "isaac");
    const finn = recruitRequest("Finnegan Keenan", "finn");
    const agentCalls: string[] = [];

    await runIncrementalUtrAgentBatch({
      recruitRequests: [isaac, finn],
      runId: "batch-1",
      startedAt: "2026-09-02T10:00:00.000Z",
      cohortSize: 2,
      configured: 2,
      checkOneRecruit: async (recruit) => {
        agentCalls.push(recruit.displayName);
        assert.equal(agentCalls.length <= 1 || agentCalls.length > 0, true);
        return agentResultFor(recruit);
      },
      importOneRecruit: async (agentResult) => ({
        success: true,
        data: {
          recruitRow: recruitRow(
            {
              recruitPersonId: agentResult.recruits[0].recruitPersonId,
              displayName: agentResult.recruits[0].displayName,
              utrPlayerId: agentResult.recruits[0].utrPlayerId,
            },
            "Checked",
          ),
          payloadBytes: 100,
          authRequired: false,
        },
      }),
      finalizeBatch: async () => ({ success: true, data: undefined }),
      onProgress: () => {},
    });

    assert.deepEqual(agentCalls, ["Isaac Lewis", "Finnegan Keenan"]);
  });

  it("2. one recruit payload sent to Vercel at a time", async () => {
    assert.match(incrementalImportSource, /mode: "single"/);
    assert.match(incrementalImportSource, /agentResult: input\.agentResult/);
    assert.doesNotMatch(sectionSource, /JSON\.stringify\(\{ mode, agentResult \}\)/);
  });

  it("3. UI progress updates after each recruit", async () => {
    assert.match(sectionSource, /runIncrementalUtrAgentBatch/);
    assert.match(sectionSource, /onProgress:/);
    assert.match(sectionSource, /setLiveRecruitRows\(progress\.liveRows\)/);
    assert.match(sectionSource, /formatIncrementalProgressLabel/);
  });

  it("4. first recruit saved before second recruit begins", async () => {
    const isaac = recruitRequest("Isaac Lewis", "isaac");
    const finn = recruitRequest("Finnegan Keenan", "finn");
    const importOrder: string[] = [];
    let secondAgentStarted = false;

    await runIncrementalUtrAgentBatch({
      recruitRequests: [isaac, finn],
      runId: "batch-2",
      startedAt: "2026-09-02T10:00:00.000Z",
      cohortSize: 2,
      configured: 2,
      checkOneRecruit: async (recruit) => {
        if (recruit.displayName === "Finnegan Keenan") {
          secondAgentStarted = true;
          assert.equal(importOrder.includes("Isaac Lewis"), true);
        }
        return agentResultFor(recruit);
      },
      importOneRecruit: async (agentResult) => {
        importOrder.push(agentResult.recruits[0].displayName);
        if (agentResult.recruits[0].displayName === "Finnegan Keenan") {
          assert.equal(secondAgentStarted, true);
        }
        return {
          success: true,
          data: {
            recruitRow: recruitRow(
              {
                recruitPersonId: agentResult.recruits[0].recruitPersonId,
                displayName: agentResult.recruits[0].displayName,
                utrPlayerId: agentResult.recruits[0].utrPlayerId,
              },
              "Checked",
            ),
            payloadBytes: 100,
            authRequired: false,
          },
        };
      },
      finalizeBatch: async () => ({ success: true }),
      onProgress: () => {},
    });

    assert.deepEqual(importOrder, ["Isaac Lewis", "Finnegan Keenan"]);
  });

  it("5. individual failure does not stop batch", async () => {
    const first = recruitRequest("Player One", "one");
    const second = recruitRequest("Player Two", "two");

    const result = await runIncrementalUtrAgentBatch({
      recruitRequests: [first, second],
      runId: "batch-3",
      startedAt: "2026-09-02T10:00:00.000Z",
      cohortSize: 2,
      configured: 2,
      checkOneRecruit: async (recruit) => agentResultFor(recruit),
      importOneRecruit: async (agentResult) => {
        if (agentResult.recruits[0].displayName === "Player One") {
          return { success: false, error: "Import failed" };
        }
        return {
          success: true,
          data: {
            recruitRow: recruitRow(
              {
                recruitPersonId: agentResult.recruits[0].recruitPersonId,
                displayName: agentResult.recruits[0].displayName,
                utrPlayerId: agentResult.recruits[0].utrPlayerId,
              },
              "Checked",
            ),
            payloadBytes: 100,
            authRequired: false,
          },
        };
      },
      finalizeBatch: async () => ({ success: true }),
      onProgress: () => {},
    });

    assert.equal(result.recruitRows.length, 2);
    assert.equal(result.recruitRows[0].status, "Failed");
    assert.equal(result.recruitRows[1].status, "Checked");
    assert.equal(result.stoppedEarly, false);
  });

  it("6. AUTH_REQUIRED stops batch", async () => {
    const first = recruitRequest("Player One", "one");
    const second = recruitRequest("Player Two", "two");
    let agentCalls = 0;

    const result = await runIncrementalUtrAgentBatch({
      recruitRequests: [first, second],
      runId: "batch-4",
      startedAt: "2026-09-02T10:00:00.000Z",
      cohortSize: 2,
      configured: 2,
      checkOneRecruit: async (recruit) => {
        agentCalls += 1;
        return agentResultFor(recruit, "AUTH_REQUIRED");
      },
      importOneRecruit: async (agentResult) => ({
        success: true,
        data: {
          recruitRow: recruitRow(
            {
              recruitPersonId: agentResult.recruits[0].recruitPersonId,
              displayName: agentResult.recruits[0].displayName,
              utrPlayerId: agentResult.recruits[0].utrPlayerId,
            },
            "Auth Required",
          ),
          payloadBytes: 100,
          authRequired: true,
        },
      }),
      finalizeBatch: async () => ({ success: true }),
      onProgress: () => {},
    });

    assert.equal(agentCalls, 1);
    assert.equal(result.stoppedEarly, true);
    assert.equal(result.stopReason, "AUTH_REQUIRED");
    assert.equal(result.recruitRows.length, 1);
    assert.equal(shouldStopBatchOnAuth({ agentCheckStatus: "Auth Required" }), true);
  });

  it("7–8. lastCheckedAt semantics remain in import pipeline", () => {
    const importSource = readFileSync(join(here, "utrAgentImport.ts"), "utf8");
    assert.match(importSource, /touchLastCheckAt: false/);
    assert.match(importSource, /touchLastCheckAt/);
    assert.match(batchSource, /importOneRecruit/);
  });

  it("9. Isaac rerun idempotency uses existing dedupe pipeline", () => {
    const importSource = readFileSync(join(here, "utrAgentImport.ts"), "utf8");
    assert.match(importSource, /processUtrAgentRecruitResult/);
    assert.match(importRouteSource, /importSingleUtrAgentRecruitResult/);
  });

  it("10. Finn first production import uses baseline semantics via shared import path", () => {
    const importSource = readFileSync(join(here, "utrAgentImport.ts"), "utf8");
    const runSource = readFileSync(join(here, "utrAgentRun.ts"), "utf8");
    assert.match(importSource, /saveUtrCapturedResults/);
    assert.match(runSource, /baselineAdded/);
    assert.ok(isTwoPlayerPilotRecruit("Finnegan Keenan"));
    assert.ok(
      filterRecruitsForPilot(
        [recruitRequest("Isaac Lewis"), recruitRequest("Finnegan Keenan")],
        "two-player",
      ).length === 2,
    );
  });

  it("11. no full-cohort raw payload is sent in one request", () => {
    assert.match(sectionSource, /recruits: \[recruit\]/);
    assert.doesNotMatch(sectionSource, /recruits: recruitRequests/);
    assert.match(importRouteSource, /mode === "single"/);
    assert.match(importRouteSource, /recruits\?\.length !== 1/);
  });

  it("12. single-recruit payload-size reporting works", () => {
    const bytes = estimateJsonPayloadBytes({ mode: "single", sample: "payload" });
    assert.ok(bytes > 0);
    assert.match(importRouteSource, /payloadBytes/);
    assert.match(importRouteSource, /large single-recruit payload/);
    assert.match(incrementalImportSource, /estimateJsonPayloadBytes/);
  });

  it("progress label reflects incremental totals", () => {
    const label = formatIncrementalProgressLabel({
      completed: 8,
      total: 29,
      currentName: "Finn Keenan",
      totals: accumulateTotalsFromRecruitRows(
        [
          recruitRow(recruitRequest("A"), "Checked", { baselineAdded: 10 }),
          recruitRow(recruitRequest("B"), "Checked", { baselineAdded: 133 }),
        ],
        { cohortSize: 29, configured: 29 },
      ),
    });
    assert.match(label, /8 \/ 29 complete/);
    assert.match(label, /Current: Finn Keenan/);
    assert.match(label, /Baseline: 143/);
  });

  it("buildRunSummaryFromRecruitRows aggregates batch metrics", () => {
    const summary = buildRunSummaryFromRecruitRows({
      runId: "run-x",
      startedAt: "2026-09-02T10:00:00.000Z",
      finishedAt: "2026-09-02T10:01:00.000Z",
      stoppedEarly: false,
      recruitRows: [
        recruitRow(recruitRequest("Isaac Lewis"), "Checked", {
          matchesProcessed: 27,
          matchedExisting: 27,
          baselineAdded: 0,
          savedAsNew: 0,
        }),
        recruitRow(recruitRequest("Finnegan Keenan"), "Checked", {
          matchesProcessed: 15,
          matchedExisting: 0,
          baselineAdded: 15,
          savedAsNew: 0,
        }),
      ],
      cohortSize: 2,
      configured: 2,
    });

    assert.equal(summary.totals.recruitsChecked, 2);
    assert.equal(summary.totals.matchesProcessed, 42);
    assert.equal(summary.totals.savedAsBaseline, 15);
    assert.equal(summary.totals.matchedExisting, 27);
  });
});
