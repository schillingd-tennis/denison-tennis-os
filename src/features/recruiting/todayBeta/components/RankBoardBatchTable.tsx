"use client";

import { ChevronRight, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { formatMonitoringTimestamp } from "../resultsCheckStatus";
import type { LiveRecruitRow } from "../utrAgentIncremental";
import { batchStatusLabel, batchStatusPillClass, type BatchDisplayStatus } from "./todayBetaBatchStatus";
import { TB_PANEL, TB_TABLE_CELL, TB_TABLE_HEAD } from "./todayBetaDashboardStyles";

export type RankBoardBatchTableRow = LiveRecruitRow & {
  lastCheckedAt?: string;
};

type StatusFilter = "all" | BatchDisplayStatus;

function formatRecruitRuntime(runtimeMs?: number): string {
  if (runtimeMs == null || !Number.isFinite(runtimeMs)) return "—";
  const seconds = Math.round(runtimeMs / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

type Props = {
  rows: RankBoardBatchTableRow[];
  tableRef?: React.RefObject<HTMLElement | null>;
};

export default function RankBoardBatchTable({ rows, tableRef }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredRows = useMemo(() => {
    let next = rows;
    if (query.trim()) {
      const normalized = query.trim().toLowerCase();
      next = next.filter((row) => row.displayName.toLowerCase().includes(normalized));
    }
    if (statusFilter !== "all") {
      next = next.filter((row) => (row.liveStatus ?? row.status) === statusFilter);
    }
    return next;
  }, [query, rows, statusFilter]);

  const filterOptions: StatusFilter[] = [
    "all",
    "Checking",
    "Pending",
    "Checked",
    "New Results",
    "Needs Review",
    "Failed",
    "Auth Required",
  ];

  return (
    <section ref={tableRef} className={`${TB_PANEL} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Rank Board Recruits</h3>
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold tabular-nums text-text-secondary">
            {rows.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recruits…"
              className="h-8 w-44 rounded-control border border-border bg-surface pl-8 pr-2 text-xs text-text-primary md:w-52"
            />
          </label>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary"
            onClick={() => setShowFilters((current) => !current)}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filters
          </button>
        </div>
      </div>

      {showFilters ? (
        <div className="flex flex-wrap gap-2 border-b border-border/60 px-4 py-2">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                statusFilter === option
                  ? "bg-[var(--module-accent)]/10 text-[var(--module-accent)]"
                  : "bg-background text-text-secondary"
              }`}
              onClick={() => setStatusFilter(option)}
            >
              {option === "all" ? "All statuses" : batchStatusLabel(option)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-background/80">
            <tr className="border-b border-border/70">
              {[
                "Recruit",
                "Status",
                "Processed",
                "Matched",
                "Baseline",
                "New",
                "Review",
                "Runtime",
                "Last Checked",
                "",
              ].map((heading) => (
                <th key={heading || "action"} className={TB_TABLE_HEAD}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-xs text-text-secondary">
                  No recruits match the current filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const status = row.liveStatus ?? row.status;
                return (
                  <tr
                    key={row.recruitPersonId}
                    className="border-b border-border/40 transition-colors hover:bg-background/50"
                  >
                    <td className={`${TB_TABLE_CELL} font-medium`}>{row.displayName}</td>
                    <td className={TB_TABLE_CELL}>
                      <span className={batchStatusPillClass(status)}>{batchStatusLabel(status)}</span>
                    </td>
                    <td className={`${TB_TABLE_CELL} tabular-nums`}>{row.matchesProcessed}</td>
                    <td className={`${TB_TABLE_CELL} tabular-nums`}>{row.matchedExisting}</td>
                    <td className={`${TB_TABLE_CELL} tabular-nums`}>{row.baselineAdded}</td>
                    <td className={`${TB_TABLE_CELL} tabular-nums`}>{row.savedAsNew}</td>
                    <td className={`${TB_TABLE_CELL} tabular-nums`}>{row.needsReview}</td>
                    <td className={`${TB_TABLE_CELL} tabular-nums`}>{formatRecruitRuntime(row.runtimeMs)}</td>
                    <td className={`${TB_TABLE_CELL} text-text-secondary`}>
                      {row.lastCheckedAt ? formatMonitoringTimestamp(row.lastCheckedAt) : "—"}
                    </td>
                    <td className={TB_TABLE_CELL}>
                      <ChevronRight className="h-3.5 w-3.5 text-text-secondary" aria-hidden />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
