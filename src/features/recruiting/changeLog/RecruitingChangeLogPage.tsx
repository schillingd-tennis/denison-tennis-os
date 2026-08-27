"use client";

import Link from "next/link";

import ModulePageShell from "@/components/ModulePageShell";

import ChangeLogFilterBar from "./ChangeLogFilterBar";
import { ChangeLogTable, CENTRAL_LOG_EMPTY } from "./ChangeLogList";
import { changeLogPageHref, type ChangeLogFilterState } from "./filters";
import { centralChangeLogSummaries } from "./summaries";
import type { ChangeLogEvent } from "./types";
import styles from "./changeLog.module.css";

export default function RecruitingChangeLogPage({
  events,
  filters,
  hasMore,
  summaryEvents,
}: {
  events: ChangeLogEvent[];
  filters: ChangeLogFilterState;
  hasMore: boolean;
  summaryEvents: ChangeLogEvent[];
}) {
  const summaries = centralChangeLogSummaries(summaryEvents);
  return (
    <ModulePageShell title="Recruiting Log" subtitle="Recent recruiting-data updates across all recruits">
      <div className="flex min-w-0 flex-col gap-3.5" data-recruiting-log-page="">
        <section className={styles.kpis} aria-label="Recruiting log summary">
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Updates today</p>
            <p className={styles.kpiValue}>{summaries.updatesToday}</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Updates this week</p>
            <p className={styles.kpiValue}>{summaries.updatesThisWeek}</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Ranking changes</p>
            <p className={styles.kpiValue}>{summaries.rankingChanges}</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Recruiting changes</p>
            <p className={styles.kpiValue}>{summaries.recruitingChanges}</p>
          </div>
        </section>
        <ChangeLogFilterBar filters={filters} />
        <section className="overflow-hidden rounded-card border border-black/[0.06] bg-surface">
          <ChangeLogTable events={events} showRecruit emptyLabel={CENTRAL_LOG_EMPTY} />
          {hasMore ? (
            <div className="border-t border-black/[0.06] px-3.5 py-2.5">
              <Link
                href={changeLogPageHref({ ...filters, offset: filters.offset + events.length })}
                className="text-[13px] font-medium text-teal-800 hover:underline"
              >
                Load more
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </ModulePageShell>
  );
}
