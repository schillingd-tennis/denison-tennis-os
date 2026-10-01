"use client";

import type { LucideIcon } from "lucide-react";
import { Gauge, User, UserCog, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { TeamPower6HistoryPoint } from "@/features/teamRatings/types";

import type { PeopleDirectoryKpis } from "../directorySummary";

const cards: {
  key: keyof PeopleDirectoryKpis | "power6";
  label: string;
  icon: LucideIcon;
  tone: "crimson" | "research" | "success" | "warning";
}[] = [
  { key: "total", label: "Total", icon: Users, tone: "crimson" },
  { key: "players", label: "Players", icon: User, tone: "research" },
  { key: "coaches", label: "Coaches", icon: UserCog, tone: "success" },
  { key: "power6", label: "Denison Power 6 UTR", icon: Gauge, tone: "warning" },
];

const toneClass: Record<(typeof cards)[number]["tone"], string> = {
  crimson: "border-[var(--module-accent)]/15 bg-[var(--module-tint)]/70",
  research: "border-research/12 bg-research/[0.07]",
  success: "border-success/15 bg-success/[0.06]",
  warning: "border-warning/18 bg-warning/[0.08]",
};

const wellClass: Record<(typeof cards)[number]["tone"], string> = {
  crimson: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
  research: "bg-research/10 text-research",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
};

const valueClass: Record<(typeof cards)[number]["tone"], string> = {
  crimson: "text-[var(--module-accent)]",
  research: "text-research",
  success: "text-success",
  warning: "text-warning",
};

function historyDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function PeopleDirectoryKpiRow({
  kpis,
  power6,
  power6History,
}: {
  kpis: PeopleDirectoryKpis;
  power6: number | null;
  power6History: TeamPower6HistoryPoint[];
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!historyOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setHistoryOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [historyOpen]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = card.key === "power6"
            ? power6 == null ? "—" : power6.toFixed(2)
            : kpis[card.key as keyof PeopleDirectoryKpis];
          const content = (
            <>
              <div className="min-w-0 text-left">
                <p className={`text-[28px] leading-none font-semibold tabular-nums tracking-tight ${valueClass[card.tone]}`}>
                  {value}
                </p>
                <p className="mt-1.5 text-[11px] font-medium tracking-wide text-text-secondary uppercase">
                  {card.label}
                </p>
              </div>
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${wellClass[card.tone]}`}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
            </>
          );
          const className = `flex min-h-[94px] w-full items-center justify-between gap-3 rounded-card border px-5 py-3.5 ${toneClass[card.tone]}`;
          return card.key === "power6" ? (
            <button
              key={card.key}
              type="button"
              className={`${className} cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/40`}
              onClick={() => setHistoryOpen(true)}
              aria-haspopup="dialog"
            >
              {content}
            </button>
          ) : (
            <div key={card.key} className={className}>{content}</div>
          );
        })}
      </div>

      {historyOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHistoryOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="power6-history-title"
            className="w-full max-w-lg overflow-hidden rounded-card border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 id="power6-history-title" className="text-lg font-semibold text-text-primary">
                  Power 6 UTR History
                </h2>
                <p className="mt-0.5 text-sm text-text-secondary">Past 10 weekly team scores</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition hover:bg-app-background hover:text-text-primary"
                aria-label="Close Power 6 history"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {power6History.length > 0 ? (
              <div className="max-h-[60vh] overflow-auto px-5 py-2">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border py-2 text-[11px] font-medium tracking-wide text-text-secondary uppercase">
                  <span>Week</span><span>Change</span><span className="text-right">Power 6</span>
                </div>
                {power6History.map((point, index) => {
                  const older = power6History[index + 1];
                  const change = older ? point.rating - older.rating : null;
                  return (
                    <div key={`${point.ratingDate}-${point.capturedAt}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border/70 py-3 last:border-0">
                      <span className="text-sm font-medium text-text-primary">{historyDate(point.ratingDate)}</span>
                      <span className={`text-sm tabular-nums ${change == null ? "text-text-secondary" : change > 0 ? "text-success" : change < 0 ? "text-danger" : "text-text-secondary"}`}>
                        {change == null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(2)}`}
                      </span>
                      <span className="min-w-14 text-right text-base font-semibold tabular-nums text-warning">{point.rating.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-text-secondary">
                No Power 6 history has been recorded yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
