"use client";

import type { UtrAgentCheckResult } from "./utrAgentClient";
import type { UtrAgentRecruitRunRow, UtrAgentRunSummary } from "./utrAgentRun";
import { estimateJsonPayloadBytes } from "./utrAgentIncremental";

export type SingleRecruitImportResponse = {
  success: boolean;
  error?: string;
  data?: {
    recruitRow: UtrAgentRecruitRunRow;
    payloadBytes: number;
    authRequired: boolean;
  };
};

export type FinalizeBatchImportResponse = {
  success: boolean;
  error?: string;
  data?: UtrAgentRunSummary;
};

export async function importSingleRecruitToDenison(input: {
  agentResult: UtrAgentCheckResult;
}): Promise<SingleRecruitImportResponse> {
  const payloadBytes = estimateJsonPayloadBytes({
    mode: "single",
    agentResult: input.agentResult,
  });

  const response = await fetch("/api/recruiting/today-beta/utr-agent-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "single",
      agentResult: input.agentResult,
      payloadBytes,
    }),
  });

  return (await response.json()) as SingleRecruitImportResponse;
}

export async function finalizeIncrementalBatchImport(input: {
  runId: string;
  startedAt: string;
  finishedAt: string;
  stoppedEarly: boolean;
  stopReason?: string;
  recruitRows: UtrAgentRecruitRunRow[];
  cohortSize: number;
  configured: number;
}): Promise<FinalizeBatchImportResponse> {
  const response = await fetch("/api/recruiting/today-beta/utr-agent-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "finalize",
      batch: input,
    }),
  });

  return (await response.json()) as FinalizeBatchImportResponse;
}
