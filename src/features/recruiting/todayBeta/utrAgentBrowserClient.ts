"use client";

/**
 * Browser-only UTR Results Agent client.
 * The local agent listens on 127.0.0.1 — reachable from the user's browser, not Vercel.
 */
import { UTR_AGENT_BASE_URL } from "./utrAgentConfig";
import type {
  UtrAgentCheckResult,
  UtrAgentHealth,
  UtrAgentRecruitRequest,
} from "./utrAgentClient";

export type { UtrAgentCheckResult, UtrAgentHealth, UtrAgentRecruitRequest };

export async function fetchUtrAgentHealthFromBrowser(): Promise<UtrAgentHealth> {
  try {
    const response = await fetch(`${UTR_AGENT_BASE_URL}/health`, {
      cache: "no-store",
      mode: "cors",
    });
    return { online: response.ok };
  } catch {
    return { online: false };
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
