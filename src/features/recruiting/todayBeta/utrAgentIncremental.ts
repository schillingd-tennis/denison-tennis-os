import type { UtrAgentRecruitRequest } from "./utrAgentClient";
import type { UtrAgentRecruitRunRow, UtrAgentRunSummary } from "./utrAgentRun";
import type { UtrAgentCheckStatus } from "./types";

export type IncrementalBatchTotals = UtrAgentRunSummary["totals"];

export type LiveRecruitRow = UtrAgentRecruitRunRow & {
  liveStatus: "Pending" | "Checking" | UtrAgentCheckStatus;
};

export function estimateJsonPayloadBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

export function isAuthRequiredAcquisition(status: string | undefined): boolean {
  return status === "AUTH_REQUIRED";
}

export function shouldStopBatchOnAuth(input: {
  acquisitionStatus?: string;
  agentCheckStatus?: UtrAgentCheckStatus;
}): boolean {
  return (
    input.acquisitionStatus === "AUTH_REQUIRED" ||
    input.agentCheckStatus === "Auth Required"
  );
}

export function accumulateTotalsFromRecruitRows(
  rows: UtrAgentRecruitRunRow[],
  input: { cohortSize: number; configured: number },
): IncrementalBatchTotals {
  let recruitsChecked = 0;
  let notConfigured = 0;
  let matchesRead = 0;
  let matchesProcessed = 0;
  let matchedExisting = 0;
  let savedAsBaseline = 0;
  let savedAsNew = 0;
  let needsReview = 0;
  let failed = 0;
  let authRequired = 0;

  for (const row of rows) {
    matchesRead += row.matchesRead;
    matchesProcessed += row.matchesProcessed;
    matchedExisting += row.matchedExisting;
    savedAsBaseline += row.baselineAdded;
    savedAsNew += row.savedAsNew;
    needsReview += row.needsReview;

    switch (row.status) {
      case "Not Configured":
        notConfigured += 1;
        break;
      case "Auth Required":
        authRequired += 1;
        failed += 1;
        break;
      case "Failed":
        failed += 1;
        break;
      default:
        recruitsChecked += 1;
        break;
    }
  }

  return {
    cohortSize: input.cohortSize,
    configured: input.configured,
    recruitsChecked,
    notConfigured,
    matchesRead,
    matchesProcessed,
    matchedExisting,
    savedAsBaseline,
    savedAsNew,
    needsReview,
    failed,
    duplicatesIgnored: 0,
    authRequired,
  };
}

export function formatIncrementalProgressLabel(input: {
  completed: number;
  total: number;
  currentName?: string;
  totals: IncrementalBatchTotals;
}): string {
  const lines = [
    "Checking Rank Board Results",
    `${input.completed} / ${input.total} complete`,
  ];
  if (input.currentName) {
    lines.push(`Current: ${input.currentName}`);
  }
  lines.push(
    `Completed: ${input.completed}`,
    `Baseline: ${input.totals.savedAsBaseline}`,
    `New: ${input.totals.savedAsNew}`,
    `Needs Review: ${input.totals.needsReview}`,
    `Failed: ${input.totals.failed}`,
  );
  return lines.join("\n");
}

export function isTwoPlayerPilotRecruit(displayName: string): boolean {
  const normalized = displayName.trim().toLowerCase();
  return normalized.includes("isaac lewis") || normalized.includes("keenan");
}

export function filterRecruitsForPilot<T extends UtrAgentRecruitRequest>(
  recruits: T[],
  mode: "isaac-only" | "two-player" | "all",
): T[] {
  if (mode === "isaac-only") {
    return recruits.filter((recruit) => recruit.displayName === "Isaac Lewis");
  }
  if (mode === "two-player") {
    return recruits.filter((recruit) => isTwoPlayerPilotRecruit(recruit.displayName));
  }
  return recruits;
}
