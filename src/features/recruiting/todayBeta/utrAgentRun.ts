import {
  listAllMonitoredRecruits,
  listUtrConfiguredMonitoredRecruits,
} from "./monitoringCohort";
import type {
  UtrAgentCheckResult,
  UtrAgentRecruitRequest,
} from "./utrAgentClient";
import {
  processUtrAgentRecruitResult,
  type UtrAgentImportRecruitOutcome,
} from "./utrAgentImport";
import { accumulateTotalsFromRecruitRows, estimateJsonPayloadBytes } from "./utrAgentIncremental";
import { recordUtrAgentBatchRun } from "./repository";
import type { UtrAgentBatchRunSummary, UtrAgentCheckStatus } from "./types";

export type UtrAgentRecruitRunRow = {
  recruitPersonId: string;
  displayName: string;
  utrPlayerId?: string;
  status: UtrAgentCheckStatus;
  matchesRead: number;
  matchesProcessed: number;
  matchedExisting: number;
  baselineAdded: number;
  savedAsNew: number;
  needsReview: number;
  runtimeMs?: number;
  errorMessage?: string;
};

export type UtrAgentRunSummary = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  stoppedEarly: boolean;
  stopReason?: string;
  recruits: UtrAgentImportRecruitOutcome[];
  recruitRows: UtrAgentRecruitRunRow[];
  batchMetrics: UtrAgentBatchRunSummary;
  totals: {
    cohortSize: number;
    configured: number;
    recruitsChecked: number;
    notConfigured: number;
    matchesRead: number;
    matchesProcessed: number;
    matchedExisting: number;
    savedAsBaseline: number;
    savedAsNew: number;
    needsReview: number;
    failed: number;
    duplicatesIgnored: number;
    authRequired: number;
  };
};

export async function buildUtrAgentRecruitRequests(): Promise<UtrAgentRecruitRequest[]> {
  const monitored = await listUtrConfiguredMonitoredRecruits();
  return monitored.map((recruit) => ({
    recruitPersonId: recruit.personId,
    displayName: recruit.displayName,
    utrPlayerId: recruit.utrPlayerId,
  }));
}

function displayStatusForRecruit(outcome: UtrAgentImportRecruitOutcome): UtrAgentCheckStatus {
  return outcome.agentCheckStatus;
}

function buildRecruitRunRow(input: {
  request: UtrAgentRecruitRequest;
  outcome?: UtrAgentImportRecruitOutcome;
  matchesRead: number;
  runtimeMs?: number;
}): UtrAgentRecruitRunRow {
  const outcome = input.outcome;
  const importOutcome = outcome?.importOutcome;

  return {
    recruitPersonId: input.request.recruitPersonId,
    displayName: input.request.displayName,
    utrPlayerId: input.request.utrPlayerId,
    status: outcome ? displayStatusForRecruit(outcome) : "Not Configured",
    matchesRead: input.matchesRead,
    matchesProcessed: importOutcome?.found ?? 0,
    matchedExisting: importOutcome?.crossSourceMatched ?? 0,
    baselineAdded: importOutcome?.savedAsBaseline ?? 0,
    savedAsNew: importOutcome?.savedAsNew ?? 0,
    needsReview: importOutcome?.needsReview ?? 0,
    runtimeMs: input.runtimeMs,
    errorMessage: outcome?.errorMessage,
  };
}

export function summarizeUtrAgentRun(input: {
  runId: string;
  startedAt: string;
  finishedAt: string;
  stoppedEarly: boolean;
  stopReason?: string;
  recruits: UtrAgentImportRecruitOutcome[];
  recruitRequests: UtrAgentRecruitRequest[];
  acquisitionByPersonId: Map<
    string,
    { matchesRead: number; startedAt?: string; finishedAt?: string }
  >;
}): UtrAgentRunSummary {
  let matchedExisting = 0;
  let savedAsBaseline = 0;
  let savedAsNew = 0;
  let needsReview = 0;
  let failed = 0;
  let authRequired = 0;
  let notConfigured = 0;
  let recruitsChecked = 0;
  let matchesRead = 0;
  let matchesProcessed = 0;
  let duplicatesIgnored = 0;

  const outcomeByPersonId = new Map(input.recruits.map((row) => [row.recruitPersonId, row]));
  const recruitRows: UtrAgentRecruitRunRow[] = [];

  for (const request of input.recruitRequests) {
    const acquisition = input.acquisitionByPersonId.get(request.recruitPersonId);
    const outcome = outcomeByPersonId.get(request.recruitPersonId);
    const runtimeMs =
      acquisition?.startedAt && acquisition?.finishedAt
        ? Math.max(0, Date.parse(acquisition.finishedAt) - Date.parse(acquisition.startedAt))
        : undefined;

    if (!request.utrPlayerId) {
      notConfigured += 1;
      recruitRows.push(
        buildRecruitRunRow({
          request,
          outcome: {
            recruitPersonId: request.recruitPersonId,
            displayName: request.displayName,
            acquisitionStatus: "NOT_CONFIGURED",
            agentCheckStatus: "Not Configured",
            errorCode: "UTR_PROFILE_NOT_CONFIGURED",
          },
          matchesRead: 0,
        }),
      );
      continue;
    }

    if (!outcome) {
      recruitRows.push({
        recruitPersonId: request.recruitPersonId,
        displayName: request.displayName,
        utrPlayerId: request.utrPlayerId,
        status: "Not Configured",
        matchesRead: 0,
        matchesProcessed: 0,
        matchedExisting: 0,
        baselineAdded: 0,
        savedAsNew: 0,
        needsReview: 0,
        errorMessage:
          input.stopReason === "AUTH_REQUIRED"
            ? "Batch stopped — login expired before this recruit"
            : "Not processed in this run",
      });
      continue;
    }

    if (outcome.agentCheckStatus === "Not Configured") {
      notConfigured += 1;
      recruitRows.push(
        buildRecruitRunRow({
          request,
          outcome,
          matchesRead: acquisition?.matchesRead ?? 0,
          runtimeMs,
        }),
      );
      continue;
    }

    if (outcome.agentCheckStatus === "Auth Required") {
      authRequired += 1;
      failed += 1;
      recruitRows.push(
        buildRecruitRunRow({
          request,
          outcome,
          matchesRead: acquisition?.matchesRead ?? 0,
          runtimeMs,
        }),
      );
      continue;
    }

    if (outcome.agentCheckStatus === "Failed") {
      failed += 1;
      recruitRows.push(
        buildRecruitRunRow({
          request,
          outcome,
          matchesRead: acquisition?.matchesRead ?? 0,
          runtimeMs,
        }),
      );
      continue;
    }

    recruitsChecked += 1;
    matchesRead += acquisition?.matchesRead ?? 0;

    if (outcome.importOutcome) {
      matchedExisting += outcome.importOutcome.crossSourceMatched;
      savedAsBaseline += outcome.importOutcome.savedAsBaseline;
      savedAsNew += outcome.importOutcome.savedAsNew;
      needsReview += outcome.importOutcome.needsReview;
      matchesProcessed += outcome.importOutcome.found;
      duplicatesIgnored += outcome.importOutcome.duplicatesIgnored;
    }

    recruitRows.push(
      buildRecruitRunRow({
        request,
        outcome,
        matchesRead: acquisition?.matchesRead ?? 0,
        runtimeMs,
      }),
    );
  }

  const configured = input.recruitRequests.filter((row) => Boolean(row.utrPlayerId)).length;
  const durationMs = Math.max(0, Date.parse(input.finishedAt) - Date.parse(input.startedAt));
  const batchMetrics: UtrAgentBatchRunSummary = {
    runId: input.runId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs,
    cohortSize: input.recruitRequests.length,
    configured,
    recruitsChecked,
    notConfigured,
    authRequired,
    failed,
    matchesAcquired: matchesRead,
    matchesProcessed,
    matchedExisting,
    baselineInserted: savedAsBaseline,
    newInserted: savedAsNew,
    needsReview,
    duplicatesIgnored,
    averageSecondsPerRecruit:
      recruitsChecked > 0 ? Math.round(durationMs / recruitsChecked / 1000) : 0,
  };

  return {
    runId: input.runId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    stoppedEarly: input.stoppedEarly,
    stopReason: input.stopReason,
    recruits: input.recruits,
    recruitRows,
    batchMetrics,
    totals: {
      cohortSize: input.recruitRequests.length,
      configured,
      recruitsChecked,
      notConfigured,
      matchesRead,
      matchesProcessed,
      matchedExisting,
      savedAsBaseline,
      savedAsNew,
      needsReview,
      failed,
      duplicatesIgnored,
      authRequired,
    },
  };
}

export function buildRunSummaryFromRecruitRows(input: {
  runId: string;
  startedAt: string;
  finishedAt: string;
  stoppedEarly: boolean;
  stopReason?: string;
  recruitRows: UtrAgentRecruitRunRow[];
  cohortSize: number;
  configured: number;
  outcomes?: UtrAgentImportRecruitOutcome[];
}): UtrAgentRunSummary {
  const totals = accumulateTotalsFromRecruitRows(input.recruitRows, {
    cohortSize: input.cohortSize,
    configured: input.configured,
  });
  const durationMs = Math.max(0, Date.parse(input.finishedAt) - Date.parse(input.startedAt));
  const batchMetrics: UtrAgentBatchRunSummary = {
    runId: input.runId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs,
    cohortSize: input.cohortSize,
    configured: input.configured,
    recruitsChecked: totals.recruitsChecked,
    notConfigured: totals.notConfigured,
    authRequired: totals.authRequired,
    failed: totals.failed,
    matchesAcquired: totals.matchesRead,
    matchesProcessed: totals.matchesProcessed,
    matchedExisting: totals.matchedExisting,
    baselineInserted: totals.savedAsBaseline,
    newInserted: totals.savedAsNew,
    needsReview: totals.needsReview,
    duplicatesIgnored: totals.duplicatesIgnored,
    averageSecondsPerRecruit:
      totals.recruitsChecked > 0 ? Math.round(durationMs / totals.recruitsChecked / 1000) : 0,
  };

  return {
    runId: input.runId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    stoppedEarly: input.stoppedEarly,
    stopReason: input.stopReason,
    recruits: input.outcomes ?? [],
    recruitRows: input.recruitRows,
    batchMetrics,
    totals,
  };
}

export async function importSingleUtrAgentRecruitResult(input: {
  agentResult: UtrAgentCheckResult;
  recruitRequest?: UtrAgentRecruitRequest;
}): Promise<{
  recruitRow: UtrAgentRecruitRunRow;
  outcome: UtrAgentImportRecruitOutcome;
  payloadBytes: number;
  authRequired: boolean;
}> {
  const recruit = input.agentResult.recruits[0];
  if (!recruit) {
    throw new Error("Missing recruit in agent result.");
  }

  const recruitRequest: UtrAgentRecruitRequest =
    input.recruitRequest ?? {
      recruitPersonId: recruit.recruitPersonId,
      displayName: recruit.displayName,
      utrPlayerId: recruit.utrPlayerId,
    };

  const payloadBytes = estimateJsonPayloadBytes({
    mode: "single",
    agentResult: input.agentResult,
  });

  const outcome = await processUtrAgentRecruitResult(recruit);
  const runtimeMs =
    recruit.startedAt && recruit.finishedAt
      ? Math.max(0, Date.parse(recruit.finishedAt) - Date.parse(recruit.startedAt))
      : undefined;

  const recruitRow = buildRecruitRunRow({
    request: recruitRequest,
    outcome,
    matchesRead: recruit.matchesRead ?? 0,
    runtimeMs,
  });

  return {
    recruitRow,
    outcome,
    payloadBytes,
    authRequired:
      recruit.status === "AUTH_REQUIRED" || outcome.agentCheckStatus === "Auth Required",
  };
}

export async function finalizeIncrementalUtrAgentBatch(input: {
  runId: string;
  startedAt: string;
  finishedAt: string;
  stoppedEarly: boolean;
  stopReason?: string;
  recruitRows: UtrAgentRecruitRunRow[];
  cohortSize: number;
  configured: number;
}): Promise<UtrAgentRunSummary> {
  const summary = buildRunSummaryFromRecruitRows(input);
  const monitoredPersonIds = (await listAllMonitoredRecruits()).map((recruit) => recruit.personId);
  await recordUtrAgentBatchRun(summary.batchMetrics, monitoredPersonIds);
  return summary;
}

export async function importUtrAgentCheckResults(input: {
  mode: "isaac-only" | "all";
  agentResult: UtrAgentCheckResult;
  recruitRequests?: UtrAgentRecruitRequest[];
}): Promise<UtrAgentRunSummary> {
  const recruitRequests =
    input.recruitRequests ?? (await buildUtrAgentRecruitRequests());
  const agentResult = input.agentResult;

  const acquisitionByPersonId = new Map(
    agentResult.recruits.map((recruit) => [
      recruit.recruitPersonId,
      {
        matchesRead: recruit.matchesRead,
        startedAt: recruit.startedAt,
        finishedAt: recruit.finishedAt,
      },
    ]),
  );

  const processed: UtrAgentImportRecruitOutcome[] = [];
  for (const recruit of agentResult.recruits) {
    const outcome = await processUtrAgentRecruitResult(recruit);
    processed.push(outcome);
    if (recruit.status === "AUTH_REQUIRED") {
      break;
    }
  }

  const summary = summarizeUtrAgentRun({
    runId: agentResult.runId,
    startedAt: agentResult.startedAt,
    finishedAt: agentResult.finishedAt,
    stoppedEarly: agentResult.stoppedEarly,
    stopReason: agentResult.stopReason,
    recruits: processed,
    recruitRequests,
    acquisitionByPersonId,
  });

  const monitoredPersonIds = (await listAllMonitoredRecruits()).map((recruit) => recruit.personId);
  await recordUtrAgentBatchRun(summary.batchMetrics, monitoredPersonIds);

  return summary;
}

/** @deprecated Server cannot reach loopback agent — use browser client + importUtrAgentCheckResults */
export async function runUtrAutomaticCheck(
  mode: "isaac-only" | "all",
): Promise<UtrAgentRunSummary> {
  throw new Error(
    "UTR agent checks must run from the browser. Vercel cannot reach the local agent.",
  );
}

export async function countMonitoredRecruitsForBatch(): Promise<{
  rankBoardCount: number;
  configured: number;
  missingUtr: number;
}> {
  const monitored = await listAllMonitoredRecruits();
  const configured = monitored.filter((recruit) => Boolean(recruit.utrPlayerId)).length;
  return {
    rankBoardCount: monitored.length,
    configured,
    missingUtr: monitored.length - configured,
  };
}
