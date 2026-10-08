"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ChevronsUpDown, ExternalLink, History, Users } from "lucide-react";

import ModulePageShell from "@/components/ModulePageShell";
import { recruitingPersonPath } from "@/lib/module-routes";

import type { RecruitRatingDashboardRow } from "../types";
import RequestRecruitRatingsButton from "./RequestRecruitRatingsButton";

type SortKey = "recruit" | "class" | "utr" | "utrChange" | "utrChecked" | "wtn" | "wtnChange" | "wtnChecked" | "trn" | "trnChange" | "stars" | "trnChecked";
type SortDirection = "asc" | "desc";

const sortValue = (row: RecruitRatingDashboardRow, key: SortKey): string | number | null => {
  switch (key) {
    case "recruit": return row.displayName.toLocaleLowerCase();
    case "class": return row.classYear;
    case "utr": return row.utr;
    case "utrChange": return row.utrChange;
    case "utrChecked": return row.utrCheckedAt ? Date.parse(row.utrCheckedAt) : null;
    case "wtn": return row.wtn;
    case "wtnChange": return row.wtnChange;
    case "wtnChecked": return row.wtnCheckedAt ? Date.parse(row.wtnCheckedAt) : null;
    case "trn": return row.trnRank;
    case "trnChange": return row.trnChange;
    case "stars": return row.trnStarRating;
    case "trnChecked": return row.trnCheckedAt ? Date.parse(row.trnCheckedAt) : null;
  }
};

function SortHeader({ label, sortKey, activeKey, direction, onSort }: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const Icon = active ? (direction === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className="px-3 py-2.5" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="flex items-center gap-1 whitespace-nowrap hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]" onClick={() => onSort(sortKey)}>
        {label}<Icon className={`h-3.5 w-3.5 ${active ? "text-[var(--module-accent)]" : "opacity-55"}`} aria-hidden="true" />
      </button>
    </th>
  );
}

function metric(value: number | null, digits = 2): string {
  return value == null ? "—" : value.toFixed(digits);
}

function change(value: number | null, inverse = false, digits = 2): string {
  if (value == null) return "—";
  const normalized = inverse ? -value : value;
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(digits)}`;
}

function changeTone(value: number | null, inverse = false): string {
  if (value == null || value === 0) return "text-text-secondary";
  const improved = inverse ? value < 0 : value > 0;
  return improved ? "text-emerald-600" : "text-red-600";
}

function checked(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Not checked";
}

function ProfileLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]"
      aria-label={`Open ${label} recruit profile in a new tab`}
      title={`Open ${label} profile`}
    >
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

export default function RecruitRatingsWorkspace({ rows, loadError }: { rows: RecruitRatingDashboardRow[]; loadError?: string | null }) {
  const [sortKey, setSortKey] = useState<SortKey>("recruit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const left = sortValue(a, sortKey);
    const right = sortValue(b, sortKey);
    if (left == null && right == null) return a.displayName.localeCompare(b.displayName);
    if (left == null) return 1;
    if (right == null) return -1;
    const comparison = typeof left === "string" && typeof right === "string"
      ? left.localeCompare(right)
      : Number(left) - Number(right);
    return (sortDirection === "asc" ? comparison : -comparison) || a.displayName.localeCompare(b.displayName);
  }), [rows, sortDirection, sortKey]);
  const groupedRows = useMemo(() => {
    const groups = new Map<number, RecruitRatingDashboardRow[]>();
    for (const row of sortedRows) {
      const group = groups.get(row.classYear) ?? [];
      group.push(row);
      groups.set(row.classYear, group);
    }
    const direction = sortKey === "class" && sortDirection === "desc" ? -1 : 1;
    return [...groups.entries()].sort(([left], [right]) => (left - right) * direction);
  }, [sortDirection, sortKey, sortedRows]);

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortKey(nextKey);
      setSortDirection("asc");
    }
  }

  const configured = (provider: "utrUrl" | "wtnUrl" | "trnUrl") => rows.filter((row) => row[provider]).length;
  const complete = rows.filter((row) => row.utrUrl && row.wtnUrl && row.trnUrl).length;
  const latest = rows.flatMap((row) => [row.utrCheckedAt, row.wtnCheckedAt, row.trnCheckedAt]).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;
  const cards = [
    { label: "Eligible 1 - Elite recruits", value: rows.length, icon: Users, tone: "border-slate-200 bg-slate-50 text-slate-700" },
    { label: "UTR configured", value: configured("utrUrl"), icon: CheckCircle2, tone: "border-blue-200 bg-blue-50 text-blue-700" },
    { label: "WTN configured", value: configured("wtnUrl"), icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    { label: "TRN configured", value: configured("trnUrl"), icon: CheckCircle2, tone: "border-violet-200 bg-violet-50 text-violet-700" },
    { label: "Needs profile", value: rows.length - complete, icon: AlertTriangle, tone: "border-amber-200 bg-amber-50 text-amber-700" },
  ];

  return (
    <ModulePageShell
      title="Weekly Changes"
      subtitle="Weekly UTR, WTN, and TennisRecruiting.net history for current and upcoming Priority 1 recruits not committed elsewhere"
      actions={<div className="flex flex-wrap gap-2"><RequestRecruitRatingsButton provider="utr" /><RequestRecruitRatingsButton provider="wtn" /><RequestRecruitRatingsButton provider="trn" /></div>}
    >
      {loadError ? <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className={`rounded-card border p-4 shadow-sm ${tone}`}><div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{value}</p></div><Icon className="h-5 w-5" /></div></article>)}
      </section>
      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-base font-semibold">Weekly rating history</h2><p className="text-xs text-text-secondary">Automatic check Wednesday at 4:00 a.m. Eastern{latest ? ` · Latest snapshot ${checked(latest)}` : ""}</p></div><History className="h-5 w-5 text-text-secondary" /></div>
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full text-left text-sm">
            <thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase"><tr>
              <SortHeader label="Recruit" sortKey="recruit" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="Class" sortKey="class" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="UTR" sortKey="utr" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="Change" sortKey="utrChange" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="Checked" sortKey="utrChecked" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="WTN" sortKey="wtn" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="Change" sortKey="wtnChange" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="Checked" sortKey="wtnChecked" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="TRN" sortKey="trn" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="Change" sortKey="trnChange" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="Stars" sortKey="stars" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
              <SortHeader label="Checked" sortKey="trnChecked" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
            </tr></thead>
            <tbody className="divide-y divide-border">{groupedRows.map(([classYear, classRows]) => (
              <Fragment key={classYear}>
                <tr className="border-y border-slate-200 bg-slate-100/90">
                  <td colSpan={12} className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-wide text-slate-700 uppercase">Class of {classYear}</span>
                      <span className="text-xs font-medium text-text-secondary">{classRows.length} {classRows.length === 1 ? "recruit" : "recruits"}</span>
                    </div>
                  </td>
                </tr>
                {classRows.map((row) => <tr key={row.personId} className="hover:bg-app-background/50"><td className="px-3 py-3"><Link className="font-semibold hover:underline" href={recruitingPersonPath(row.personId)}>{row.displayName}</Link></td><td className="px-3 py-3 tabular-nums">{row.classYear}</td><td className="px-3 py-3"><div className="flex items-center gap-1 tabular-nums">{metric(row.utr)}<ProfileLink label="UTR" url={row.utrUrl} /></div></td><td className={`px-3 py-3 font-semibold tabular-nums ${changeTone(row.utrChange)}`}>{change(row.utrChange)}</td><td className="px-3 py-3 whitespace-nowrap text-text-secondary">{checked(row.utrCheckedAt)}</td><td className="px-3 py-3"><div className="flex items-center gap-1 tabular-nums">{metric(row.wtn)}<ProfileLink label="WTN" url={row.wtnUrl} /></div></td><td className={`px-3 py-3 font-semibold tabular-nums ${changeTone(row.wtnChange, true)}`}>{change(row.wtnChange, true)}</td><td className="px-3 py-3 whitespace-nowrap text-text-secondary">{checked(row.wtnCheckedAt)}</td><td className="px-3 py-3"><div className="flex items-center gap-1 tabular-nums">{row.trnRank == null ? "—" : `#${Math.round(row.trnRank)}`}<ProfileLink label="TennisRecruiting.net" url={row.trnUrl} /></div></td><td className={`px-3 py-3 font-semibold tabular-nums ${changeTone(row.trnChange, true)}`}>{change(row.trnChange, true, 0)}</td><td className="px-3 py-3">{row.trnStarRating == null ? "—" : `${row.trnStarRating}★`}</td><td className="px-3 py-3 whitespace-nowrap text-text-secondary">{checked(row.trnCheckedAt)}</td></tr>)}
              </Fragment>
            ))}</tbody>
          </table>
        </div>
      </section>
    </ModulePageShell>
  );
}
