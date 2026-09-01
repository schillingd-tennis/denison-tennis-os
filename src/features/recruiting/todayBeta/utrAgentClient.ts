import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  UTR_AGENT_BASE_URL,
  UTR_AGENT_SECRET_HEADER,
} from "./utrAgentConfig";

export type UtrAgentHealth = {
  online: boolean;
};

export type UtrAgentRecruitRequest = {
  recruitPersonId: string;
  displayName: string;
  utrPlayerId?: string;
};

export type UtrAgentRecruitAcquisition = {
  recruitPersonId: string;
  displayName: string;
  utrPlayerId?: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  sourceUrl?: string;
  matchesRead: number;
  startedAt?: string;
  finishedAt?: string;
  payload?: unknown;
};

export type UtrAgentCheckResult = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  stoppedEarly: boolean;
  stopReason?: string;
  recruits: UtrAgentRecruitAcquisition[];
  summary: {
    recruitsRequested: number;
    recruitsChecked: number;
    recruitsFailed: number;
    recruitsNotConfigured: number;
    matchesRead: number;
  };
};

function readAgentSecret(): string | null {
  if (process.env.UTR_AGENT_SECRET?.trim()) {
    return process.env.UTR_AGENT_SECRET.trim();
  }
  const secretPath = join(process.cwd(), ".local/utr-agent-secret");
  if (!existsSync(secretPath)) return null;
  return readFileSync(secretPath, "utf8").trim() || null;
}

export async function fetchUtrAgentHealth(): Promise<UtrAgentHealth> {
  try {
    const response = await fetch(`${UTR_AGENT_BASE_URL}/health`, {
      cache: "no-store",
    });
    return { online: response.ok };
  } catch {
    return { online: false };
  }
}

export async function requestUtrAgentCheck(input: {
  mode: "isaac-only" | "all";
  recruits: UtrAgentRecruitRequest[];
}): Promise<UtrAgentCheckResult> {
  const secret = readAgentSecret();
  if (!secret) {
    throw new Error("AGENT_OFFLINE");
  }

  let response: Response;
  try {
    response = await fetch(`${UTR_AGENT_BASE_URL}/check-recruits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [UTR_AGENT_SECRET_HEADER]: secret,
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
    recruits?: UtrAgentRecruitAcquisition[];
    summary?: UtrAgentCheckResult["summary"];
  };

  if (!response.ok || !body.ok || !body.runId || !body.recruits || !body.summary) {
    if (body.error === "AGENT_BUSY") {
      throw new Error("AGENT_BUSY");
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
