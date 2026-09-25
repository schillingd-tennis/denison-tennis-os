"use client";

/**
 * Browser-only UTR Results Agent client.
 * The local agent listens on https://localhost:4317 — reachable from the user's browser, not Vercel.
 */
import { UTR_AGENT_BASE_URL } from "./utrAgentConfig";
import type {
  UtrAgentCheckResult,
  UtrAgentRecruitRequest,
} from "./utrAgentClient";

export type { UtrAgentCheckResult, UtrAgentRecruitRequest };

export type UtrAgentHealth = {
  online: boolean;
  checkedAt: string;
  /** Agent process start time from a verified /health response. */
  agentStartedAt?: string;
  /** Safe, user-facing reason when offline — never secrets or stacks. */
  errorSummary?: string;
};

export async function fetchUtrAgentHealthFromBrowser(): Promise<UtrAgentHealth> {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(`${UTR_AGENT_BASE_URL}/health`, {
      cache: "no-store",
      mode: "cors",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return {
        online: false,
        checkedAt,
        errorSummary: `Local agent health returned HTTP ${response.status}.`,
      };
    }
    const body = (await response.json()) as {
      ok?: boolean;
      status?: string;
      startedAt?: string;
      checkedAt?: string;
    };
    if (!body.ok) {
      return {
        online: false,
        checkedAt,
        errorSummary: "Local agent responded but did not report healthy.",
      };
    }
    return {
      online: true,
      checkedAt: body.checkedAt ?? checkedAt,
      agentStartedAt: body.startedAt,
    };
  } catch {
    return {
      online: false,
      checkedAt,
      errorSummary:
        "Cannot reach the local UTR Results Agent. Run npm run utr:agent on this Mac, then Refresh Status.",
    };
  }
}

export async function requestUtrAgentCheckFromBrowser(input: {
  mode: "isaac-only" | "all";
  recruits: UtrAgentRecruitRequest[];
}): Promise<UtrAgentCheckResult> {
  let response: Response;
  try {
    response = await fetch(`${UTR_AGENT_BASE_URL}/check-recruits`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("AGENT_OFFLINE");
  }

  const body = (await response.json()) as {
    ok?: boolean;
    error?: string;
    runId?: string;
    startedAt?: string;
    finishedAt?: string;
    stoppedEarly?: boolean;
    stopReason?: string;
    recruits?: UtrAgentCheckResult["recruits"];
    summary?: UtrAgentCheckResult["summary"];
  };

  if (!response.ok || !body.ok || !body.runId || !body.recruits || !body.summary) {
    if (body.error === "AGENT_BUSY") {
      throw new Error("AGENT_BUSY");
    }
    if (response.status === 403 || response.status === 401) {
      throw new Error("AGENT_FORBIDDEN");
    }
    throw new Error(body.error ?? "UTR_RESULTS_FAILED");
  }

  return {
    runId: body.runId,
    startedAt: body.startedAt ?? new Date().toISOString(),
    finishedAt: body.finishedAt ?? new Date().toISOString(),
    stoppedEarly: Boolean(body.stoppedEarly),
    stopReason: body.stopReason,
    recruits: body.recruits,
    summary: body.summary,
  };
}
