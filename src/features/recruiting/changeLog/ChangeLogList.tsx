"use client";

import Link from "next/link";
import {
  Flag,
  GraduationCap,
  Medal,
  Plane,
  School,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { recruitingPersonLogPath } from "@/lib/module-routes";

import {
  CHANGE_LOG_CATEGORY_LABELS,
  CENTRAL_LOG_EMPTY,
  DASHBOARD_EMPTY_LOG,
  RECRUIT_CARD_EMPTY_LOG,
  changeLogActorSourceLabel,
  changeLogEventTitle,
  changeLogRelativeLabel,
  changeLogTimestampLabel,
} from "./display";
import type { ChangeLogCategory, ChangeLogEvent } from "./types";
import styles from "./changeLog.module.css";

const CATEGORY_ICONS: Record<ChangeLogCategory, LucideIcon> = {
  profile: UserRound,
  rankings: Medal,
  recruiting: Flag,
  academics: GraduationCap,
  schools: School,
  visits: Plane,
  system: Settings,
};

function CategoryIcon({ category }: { category: ChangeLogCategory }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-teal-800">
      <Icon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

function ExpandableSummary({ summary }: { summary: string }) {
  const long = summary.length > 90;
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className={styles.summary}>{long && !open ? `${summary.slice(0, 90)}…` : summary}</p>
      {long ? (
        <button
          type="button"
          className="mt-0.5 text-[11px] font-medium text-teal-800 hover:underline"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export function ChangeLogTable({
  events,
  showRecruit,
  emptyLabel,
}: {
  events: ChangeLogEvent[];
  showRecruit: boolean;
  emptyLabel: string;
}) {
  if (events.length === 0) {
    return <p className={styles.empty}>{emptyLabel}</p>;
  }
  return (
    <div className={styles.table} data-change-log-table="">
      {events.map((event) => (
        <article
          key={event.id}
          className={`${styles.row} ${showRecruit ? "" : styles.personRow}`}
          data-change-log-row=""
        >
          <CategoryIcon category={event.category} />
          {showRecruit ? (
            <Link
              href={recruitingPersonLogPath(event.recruitPersonId)}
              className="min-w-0 truncate text-[13px] font-semibold text-text-primary hover:text-teal-800 hover:underline"
            >
              {event.recruitName}
            </Link>
          ) : null}
          <div className="min-w-0">
            <p className={styles.title}>{changeLogEventTitle(event)}</p>
            <ExpandableSummary summary={event.summary} />
          </div>
          <span className={styles.meta}>{CHANGE_LOG_CATEGORY_LABELS[event.category]}</span>
          <time className={styles.meta} dateTime={event.occurredAt}>
            {changeLogTimestampLabel(event.occurredAt)}
          </time>
          <span className={styles.meta}>{changeLogActorSourceLabel(event)}</span>
        </article>
      ))}
    </div>
  );
}

export function DashboardChangeLogRows({ events }: { events: ChangeLogEvent[] }) {
  if (events.length === 0) {
    return <p className={styles.empty}>{DASHBOARD_EMPTY_LOG}</p>;
  }
  return (
    <ul data-dashboard-recent-updates="">
      {events.slice(0, 5).map((event) => (
        <li key={event.id} className={styles.compactRow}>
          <CategoryIcon category={event.category} />
          <div className="min-w-0">
            <Link
              href={recruitingPersonLogPath(event.recruitPersonId)}
              className="block truncate text-[13px] font-semibold text-text-primary hover:text-teal-800 hover:underline"
            >
              {event.recruitName}
            </Link>
            <p className={styles.summary}>
              {changeLogEventTitle(event)}
              {event.summary ? ` — ${event.summary}` : ""}
            </p>
          </div>
          <time className={styles.meta} dateTime={event.occurredAt}>
            {changeLogRelativeLabel(event.occurredAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export { CENTRAL_LOG_EMPTY, RECRUIT_CARD_EMPTY_LOG };
