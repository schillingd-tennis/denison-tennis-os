import type { UtrAgentCheckResult, UtrAgentRecruitRequest } from "./utrAgentClient";
import type { UtrAgentRecruitRunRow, UtrAgentRunSummary } from "./utrAgentRun";
import {
  accumulateTotalsFromRecruitRows,
  estimateJsonPayloadBytes,
  shouldStopBatchOnAuth,
  type LiveRecruitRow,
} from "./utrAgentIncremental";
import type { SingleRecruitImportResponse } from "./utrAgentIncrementalImport";

export type IncrementalBatchProgress = {
  completed: number;
  total: number;
  currentName?: string;
  totals: ReturnType<typeof accumulateTotalsFromRecruitRows>;
  liveRows: LiveRecruitRow[];
  lastPayloadBytes?: number;
};

export type IncrementalBatchResult = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  stoppedEarly: boolean;
  stopReason?: string;
  recruitRows: UtrAgentRecruitRunRow[];
  payloadBytesByRecruit: Record<string, number>;
  summary?: UtrAgentRunSummary;
};

function initialLiveRows(recruitRequests: UtrAgentRecruitRequest[]): LiveRecruitRow[] {
  return recruitRequests.map((request) => ({
    recruitPersonId: request.recruitPersonId,
    displayName: request.displayName,
    utrPlayerId: request.utrPlayerId,
    status: "Not Configured" as const,
    matchesRead: 0,
    matchesProcessed: 0,
    matchedExisting: 0,
    baselineAdded: 0,
    savedAsNew: 0,
    needsReview: 0,
    liveStatus: "Pending" as const,
  }));
}

function buildSingleRecruitAgentResult(input: {
  batchRunId: string;
  batchStartedAt: string;
  agentResult: UtrAgentCheckResult;
}): UtrAgentCheckResult {
  const recruit = input.agentResult.recruits[0];
  return {
    runId: input.batchRunId,
    startedAt: recruit?.startedAt ?? input.batchStartedAt,
    finishedAt: recruit?.finishedAt ?? new Date().toISOString(),
    stoppedEarly: false,
    recruits: input.agentResult.recruits.slice(0, 1),
    summary: input.agentResult.summary,
  };
}

function failedRecruitRow(
  request: UtrAgentRecruitRequest,
  errorMessage: string,
): UtrAgentRecruitRunRow {
  return {
    recruitPersonId: request.recruitPersonId,
    displayName: request.displayName,
    utrPlayerId: request.utrPlayerId,
    status: "Failed",
    matchesRead: 0,
    matchesProcessed: 0,
    matchedExisting: 0,
    baselineAdded: 0,
    savedAsNew: 0,
    needsReview: 0,
    errorMessage,
  };
}

export async function runIncrementalUtrAgentBatch(input: {
  recruitRequests: UtrAgentRecruitRequest[];
  runId: string;
  startedAt: string;
  cohortSize: number;
  configured: number;
  checkOneRecruit: (recruit: UtrAgentRecruitRequest) => Promise<UtrAgentCheckResult>;
  importOneRecruit: (agentResult: UtrAgentCheckResult) => Promise<SingleRecruitImportResponse>;
  finalizeBatch: (input: {
    runId: string;
    startedAt: string;
    finishedAt: string;
    stoppedEarly: boolean;
    stopReason?: string;
    recruitRows: UtrAgentRecruitRunRow[];
    cohortSize: number;
    configured: number;
  }) => Promise<{ success: boolean; data?: UtrAgentRunSummary; error?: string }>;
  onProgress: (progress: IncrementalBatchProgress) => void;
}): Promise<IncrementalBatchResult> {
  const recruitRows: UtrAgentRecruitRunRow[] = [];
  const payloadBytesByRecruit: Record<string, number> = {};
  const liveRows = initialLiveRows(input.recruitRequests);
  let stoppedEarly = false;
  let stopReason: string | undefined;
  let lastPayloadBytes: number | undefined;

  const emitProgress = (completed: number, currentName?: string) => {
    input.onProgress({
      completed,
      total: input.recruitRequests.length,
      currentName,
      totals: accumulateTotalsFromRecruitRows(recruitRows, {
        cohortSize: input.cohortSize,
        configured: input.configured,
      }),
      liveRows: [...liveRows],
      lastPayloadBytes,
    });
  };

  emitProgress(0, input.recruitRequests[0]?.displayName);

  for (let index = 0; index < input.recruitRequests.length; index += 1) {
    const request = input.recruitRequests[index];
    liveRows[index] = { ...liveRows[index], liveStatus: "Checking" };
    emitProgress(recruitRows.length, request.displayName);

    let recruitRow: UtrAgentRecruitRunRow;
    try {
      const agentResult = await input.checkOneRecruit(request);
      if (agentResult.recruits.length !== 1) {
        recruitRow = failedRecruitRow(request, "Agent returned unexpected recruit count.");
      } else {
        const singleAgentResult = buildSingleRecruitAgentResult({
          batchRunId: input.runId,
          batchStartedAt: input.startedAt,
          agentResult,
        });
        const payloadBytes = estimateJsonPayloadBytes({
          mode: "single",
          agentResult: singleAgentResult,
        });
        payloadBytesByRecruit[request.recruitPersonId] = payloadBytes;
        lastPayloadBytes = payloadBytes;

        const importResult = await input.importOneRecruit(singleAgentResult);
        if (!importResult.success || !importResult.data) {
          recruitRow = failedRecruitRow(
            request,
            importResult.error ?? "Import failed for this recruit.",
          );
        } else {
          recruitRow = importResult.data.recruitRow;
          if (shouldStopBatchOnAuth({ agentCheckStatus: recruitRow.status })) {
            stoppedEarly = true;
            stopReason = "AUTH_REQUIRED";
          }
        }
      }
    } catch (error) {
      recruitRow = failedRecruitRow(
        request,
        error instanceof Error ? error.message : "Recruit check failed.",
      );
    }

    recruitRows.push(recruitRow);
    liveRows[index] = { ...recruitRow, liveStatus: recruitRow.status };
    emitProgress(recruitRows.length, input.recruitRequests[index + 1]?.displayName);

    if (stoppedEarly) {
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const finalizeResult = await input.finalizeBatch({
    runId: input.runId,
    startedAt: input.startedAt,
    finishedAt,
    stoppedEarly,
    stopReason,
    recruitRows,
    cohortSize: input.cohortSize,
    configured: input.configured,
  });

  return {
    runId: input.runId,
    startedAt: input.startedAt,
    finishedAt,
    stoppedEarly,
    stopReason,
    recruitRows,
    payloadBytesByRecruit,
    summary: finalizeResult.data,
  };
}
