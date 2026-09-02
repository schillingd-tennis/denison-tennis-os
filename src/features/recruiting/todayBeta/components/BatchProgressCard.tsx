"use client";

import { Loader2 } from "lucide-react";

import { formatMonitoringTimestamp } from "../resultsCheckStatus";
import { TB_PANEL } from "./todayBetaDashboardStyles";

export type BatchProgressState = {
  completed: number;
  total: number;
  currentName?: string;
  startedAt: string;
  inProgress: boolean;
  totals: {
    completed: number;
    savedAsBaseline: number;
    savedAsNew: number;
    needsReview: number;
    failed: number;
  };
};

function estimateRemainingLabel(progress: BatchProgressState): string | null {
  if (!progress.inProgress || progress.completed <= 0 || progress.completed >= progress.total) {
    return null;
  }
  const elapsedMs = Date.now() - Date.parse(progress.startedAt);
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return null;
  const msPerRecruit = elapsedMs / progress.completed;
  const remainingMs = msPerRecruit * (progress.total - progress.completed);
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `~${minutes} min`;
}

function formatStartedTime(iso: string): string {
  const formatted = formatMonitoringTimestamp(iso);
  const parts = formatted.split(" ");
  return parts.length >= 2 ? parts.slice(-2).join(" ") : formatted;
}

function InlineMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "accent" | "warning" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-green-700"
      : tone === "accent"
        ? "text-[var(--module-accent)]"
        : tone === "warning"
          ? "text-amber-700"
          : tone === "danger"
            ? "text-red-700"
            : "text-text-primary";

  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className={`font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </span>
  );
}

export default function BatchProgressCard({ progress }: { progress: BatchProgressState }) {
  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.completed / progress.total) * 100)) : 0;
  const remaining = estimateRemainingLabel(progress);

  return (
    <section className={`${TB_PANEL} px-4 py-3.5`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">Checking Rank Board Results</h3>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
          In Progress
        </span>
      </div>

      <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
        <div className="min-w-0 shrink-0 lg:w-[11rem] xl:w-[13rem]">
          <p className="text-sm font-semibold tabular-nums text-text-primary">
            {progress.completed} / {progress.total} complete
          </p>
          <p className="mt-0.5 truncate text-xs text-text-primary">
            Current:{" "}
            <span className="font-semibold">{progress.currentName ?? "Starting…"}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--module-accent)]">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Checking…
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full bg-[var(--module-accent)] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 lg:justify-end">
          <InlineMetric label="Done" value={progress.totals.completed} tone="success" />
          <InlineMetric label="Base" value={progress.totals.savedAsBaseline} />
          <InlineMetric label="New" value={progress.totals.savedAsNew} tone="accent" />
          <InlineMetric label="Rev" value={progress.totals.needsReview} tone="warning" />
          <InlineMetric label="Fail" value={progress.totals.failed} tone="danger" />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-text-secondary">
        <span>
          Started <span className="font-medium text-text-primary">{formatStartedTime(progress.startedAt)}</span>
        </span>
        {remaining ? (
          <span>
            Est. remaining <span className="font-medium text-text-primary">{remaining}</span>
          </span>
        ) : null}
      </div>
    </section>
  );
}
