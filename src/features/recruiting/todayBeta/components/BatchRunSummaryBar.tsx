"use client";

import { formatMonitoringTimestamp } from "../resultsCheckStatus";
import type { UtrAgentBatchRunSummary } from "../types";
import type { UtrAgentRunSummary } from "../utrAgentRun";
import { TB_PANEL } from "./todayBetaDashboardStyles";

function formatDurationMs(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export type BatchRunSummaryData = {
  recruitsChecked: number;
  matchesProcessed: number;
  savedAsNew: number;
  failed: number;
  durationMs: number;
  finishedAt: string;
};

export function batchRunSummaryFromRunSummary(summary: UtrAgentRunSummary): BatchRunSummaryData {
  return {
    recruitsChecked: summary.totals.recruitsChecked,
    matchesProcessed: summary.totals.matchesProcessed,
    savedAsNew: summary.totals.savedAsNew,
    failed: summary.totals.failed,
    durationMs: Math.max(0, Date.parse(summary.finishedAt) - Date.parse(summary.startedAt)),
    finishedAt: summary.finishedAt,
  };
}

export function batchRunSummaryFromBatchMetrics(batch: UtrAgentBatchRunSummary): BatchRunSummaryData {
  return {
    recruitsChecked: batch.recruitsChecked,
    matchesProcessed: batch.matchesProcessed,
    savedAsNew: batch.newInserted,
    failed: batch.failed,
    durationMs: batch.durationMs,
    finishedAt: batch.finishedAt,
  };
}

type Props = {
  summary: BatchRunSummaryData;
  onViewDetails?: () => void;
  detailsOpen?: boolean;
};

export default function BatchRunSummaryBar({ summary, onViewDetails, detailsOpen }: Props) {
  const statsLine = [
    `${summary.recruitsChecked} checked`,
    `${summary.matchesProcessed} processed`,
    `${summary.savedAsNew} new`,
    `${summary.failed} failed`,
    formatDurationMs(summary.durationMs),
  ].join(" · ");

  return (
    <section className={`${TB_PANEL} px-4 py-3`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Checking Rank Board Results</h3>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
              Complete
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            Last run complete · {statsLine}
          </p>
          <p className="text-[11px] text-text-secondary">
            Last run {formatMonitoringTimestamp(summary.finishedAt)}
          </p>
        </div>
        {onViewDetails ? (
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-[var(--module-accent)] hover:underline"
            onClick={onViewDetails}
          >
            {detailsOpen ? "Hide run details" : "View run details"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
