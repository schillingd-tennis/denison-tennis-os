"use client";

import { CheckCircle2, Database, Sparkles, Timer, Users } from "lucide-react";

import { formatMonitoringTimestamp } from "../resultsCheckStatus";
import type { TodayBetaActivitySummary } from "../types";
import TodaySummaryCard from "./TodaySummaryCard";
import { TB_KPI_GRID } from "./todayBetaDashboardStyles";

function formatAgentRuntime(summary: TodayBetaActivitySummary): string {
  const batch = summary.utrAgentLastBatch;
  if (!batch) return "Never";
  const seconds = Math.max(1, Math.round(batch.durationMs / 1000));
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatLastRunSubtext(summary: TodayBetaActivitySummary): string {
  const batch = summary.utrAgentLastBatch;
  if (batch?.finishedAt) {
    return `Last run ${formatMonitoringTimestamp(batch.finishedAt)}`;
  }
  return "No agent runs yet";
}

function needsReviewSubtext(summary: TodayBetaActivitySummary): string {
  const review = summary.utrAgentLastBatch?.needsReview ?? 0;
  if (review > 0) return `${review} needs review`;
  if (summary.newResultsCount > 0) {
    return `${summary.newResultsCount} newly detected`;
  }
  return "No review items";
}

export default function TodayBetaKpiCards({ summary }: { summary: TodayBetaActivitySummary }) {
  const checkedLabel =
    summary.recruitsMonitored === 0
      ? "0 / 0"
      : `${summary.checkedTodayCount} / ${summary.recruitsMonitored}`;

  return (
    <section aria-label="Today Beta summary" className={TB_KPI_GRID}>
      <TodaySummaryCard
        label="Rank Board Recruits"
        value={String(summary.recruitsMonitored)}
        subtext={`UTR configured: ${summary.utrConfiguredCount}`}
        icon={Users}
        iconTint="bg-[var(--module-accent)]/10 text-[var(--module-accent)]"
      />
      <TodaySummaryCard
        label="Checked Today"
        value={checkedLabel}
        subtext={
          summary.lastMonitoringActivityAt
            ? `Last activity: ${formatMonitoringTimestamp(summary.lastMonitoringActivityAt)}`
            : "No checks logged today"
        }
        icon={CheckCircle2}
        iconTint="bg-green-50 text-green-700"
      />
      <TodaySummaryCard
        label="New Results"
        value={String(summary.newResultsCount)}
        subtext={needsReviewSubtext(summary)}
        icon={Sparkles}
        iconTint="bg-blue-50 text-blue-700"
      />
      <TodaySummaryCard
        label="Matches Stored"
        value={String(summary.matchesStored)}
        subtext="Across all recruits"
        icon={Database}
        iconTint="bg-purple-50 text-purple-700"
      />
      <TodaySummaryCard
        label="Agent Runtime"
        value={formatAgentRuntime(summary)}
        subtext={formatLastRunSubtext(summary)}
        icon={Timer}
        iconTint="bg-orange-50 text-orange-700"
      />
    </section>
  );
}
