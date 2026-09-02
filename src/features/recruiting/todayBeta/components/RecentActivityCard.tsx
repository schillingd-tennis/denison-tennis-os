"use client";

import { Loader2 } from "lucide-react";

import type { LiveRecruitRow } from "../utrAgentIncremental";
import { activityBadgeClass, activityBadgeLabel } from "./todayBetaBatchStatus";
import { TB_PANEL } from "./todayBetaDashboardStyles";

function rowSecondaryLine(row: LiveRecruitRow): string {
  const status = row.liveStatus ?? row.status;
  if (status === "Checking") return "Checking…";
  if (status === "Pending") return "Pending";
  if (row.matchesProcessed > 0) return `${row.matchesProcessed} processed`;
  if (row.errorMessage) return row.errorMessage;
  return "Processed";
}

type Props = {
  rows: LiveRecruitRow[];
  onViewAll?: () => void;
};

export default function RecentActivityCard({ rows, onViewAll }: Props) {
  const activityRows = (() => {
    const checking = rows.find((row) => row.liveStatus === "Checking");
    const completed = rows.filter(
      (row) => row.liveStatus !== "Pending" && row.liveStatus !== "Checking",
    );
    const pending = rows.filter((row) => row.liveStatus === "Pending");
    const ordered: LiveRecruitRow[] = [];

    if (checking) ordered.push(checking);
    for (let index = completed.length - 1; index >= 0 && ordered.length < 3; index -= 1) {
      ordered.push(completed[index]);
    }
    for (const row of pending) {
      if (ordered.length >= 3) break;
      if (!ordered.some((entry) => entry.recruitPersonId === row.recruitPersonId)) {
        ordered.push(row);
      }
    }
    return ordered.slice(0, 3);
  })();

  return (
    <section className={`${TB_PANEL} flex h-full flex-col px-3 py-3`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
        {onViewAll ? (
          <button
            type="button"
            className="text-[11px] font-semibold text-[var(--module-accent)] hover:underline"
            onClick={onViewAll}
          >
            View all
          </button>
        ) : null}
      </div>

      <ul className="mt-2 space-y-0">
        {activityRows.length === 0 ? (
          <li className="py-2 text-xs text-text-secondary">Waiting for activity…</li>
        ) : (
          activityRows.map((row) => {
            const checking = (row.liveStatus ?? row.status) === "Checking";
            return (
              <li
                key={row.recruitPersonId}
                className="flex items-start justify-between gap-2 border-b border-border/40 py-1.5 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-text-primary">{row.displayName}</p>
                  <p className="flex items-center gap-1 text-[11px] text-text-secondary">
                    {checking ? <Loader2 className="h-3 w-3 animate-spin text-[var(--module-accent)]" aria-hidden /> : null}
                    {rowSecondaryLine(row)}
                    {!checking && row.matchesProcessed > 0 ? (
                      <span className="text-text-secondary/70">· {activityBadgeLabel(row)}</span>
                    ) : null}
                  </p>
                </div>
                {!checking ? (
                  <span className={`shrink-0 ${activityBadgeClass(row)}`}>{activityBadgeLabel(row)}</span>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
