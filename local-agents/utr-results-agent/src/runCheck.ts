import { checkRecruit } from "./checkRecruit.js";
import { getPersistentContext, isAgentBusy, setAgentBusy } from "./browser.js";
import { isDebugBrowser, ISAAC_UTR_PLAYER_ID, PAUSE_BETWEEN_RECRUITS_MS } from "./config.js";
import { logRecruitDiagnostics } from "./logger.js";
import type {
  AgentCheckMode,
  AgentCheckRequest,
  AgentCheckResponse,
  AgentRecruitInput,
  AgentRecruitResult,
} from "./types.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function selectRecruitsForMode(
  recruits: AgentRecruitInput[],
  mode: AgentCheckMode,
): AgentRecruitInput[] {
  if (mode === "isaac-only") {
    return recruits.filter(
      (recruit) =>
        recruit.utrPlayerId === ISAAC_UTR_PLAYER_ID ||
        recruit.displayName === "Isaac Lewis",
    );
  }
  return recruits;
}

export async function runRecruitChecks(
  request: AgentCheckRequest,
): Promise<AgentCheckResponse> {
  if (isAgentBusy()) {
    throw new Error("AGENT_BUSY");
  }

  setAgentBusy(true);
  const runId = `utr-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const results: AgentRecruitResult[] = [];
  let stoppedEarly = false;
  let stopReason: string | undefined;

  try {
    const queue = selectRecruitsForMode(request.recruits, request.mode);
    const headless = !isDebugBrowser();
    if (!headless) {
      console.log("UTR_AGENT_DEBUG_BROWSER=true — running with visible Chromium.");
    }
    const context = await getPersistentContext({ headless });

    for (let index = 0; index < queue.length; index += 1) {
      const recruit = queue[index]!;
      const recruitStartedAt = new Date().toISOString();
      const result = await checkRecruit(context, recruit);
      const recruitFinishedAt = new Date().toISOString();
      results.push({
        ...result,
        startedAt: recruitStartedAt,
        finishedAt: recruitFinishedAt,
      });

      logRecruitDiagnostics({
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        recruit: recruit.displayName,
        status: result.status,
        matchesRead: result.matchesRead,
        errorCode: result.errorCode,
        diagnosticStatus: result.diagnosticStatus,
        diagnostics: result.diagnostics,
      });

      if (result.status === "AUTH_REQUIRED") {
        stoppedEarly = true;
        stopReason = "AUTH_REQUIRED";
        break;
      }

      if (index < queue.length - 1) {
        await sleep(PAUSE_BETWEEN_RECRUITS_MS);
      }
    }
  } finally {
    setAgentBusy(false);
  }

  const finishedAt = new Date().toISOString();
  const recruitsChecked = results.filter((row) => row.status === "OK").length;
  const recruitsFailed = results.filter(
    (row) =>
      row.status === "UTR_PAGE_LOAD_FAILED" ||
      row.status === "UTR_RESULTS_FAILED" ||
      row.status === "AUTH_REQUIRED",
  ).length;
  const recruitsNotConfigured = results.filter(
    (row) => row.status === "NOT_CONFIGURED",
  ).length;
  const matchesRead = results.reduce((total, row) => total + row.matchesRead, 0);

  return {
    runId,
    startedAt,
    finishedAt,
    stoppedEarly,
    stopReason,
    recruits: results,
    summary: {
      recruitsRequested: results.length,
      recruitsChecked,
      recruitsFailed,
      recruitsNotConfigured,
      matchesRead,
    },
  };
}
