"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ChevronsUpDown, Gauge, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import ModulePageShell from "@/components/ModulePageShell";
import { playersCoachesPersonPath } from "@/lib/module-routes";

import type { TeamRatingDashboardRow } from "../types";
import RequestRatingsButton from "./RequestRatingsButton";

function value(value: number | null): string { return value == null ? "—" : value.toFixed(2); }
function change(value: number | null): string {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}
function checked(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Not checked";
}

type SortKey = "player" | "utr" | "utrChange" | "utrCheckedAt" | "wtn" | "wtnChange" | "wtnCheckedAt" | "status";
type SortDirection = "asc" | "desc";
type CardTone = "crimson" | "research" | "success" | "warning" | "info";

const toneClass: Record<CardTone, string> = {
  crimson: "border-[var(--module-accent)]/15 bg-[var(--module-tint)]/70",
  research: "border-research/12 bg-research/[0.07]",
  success: "border-success/15 bg-success/[0.06]",
  warning: "border-warning/18 bg-warning/[0.08]",
  info: "border-blue-500/15 bg-blue-500/[0.06]",
};
const wellClass: Record<CardTone, string> = {
  crimson: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
  research: "bg-research/10 text-research",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-blue-500/10 text-blue-600",
};
const valueClass: Record<CardTone, string> = {
  crimson: "text-[var(--module-accent)]",
  research: "text-research",
  success: "text-success",
  warning: "text-warning",
  info: "text-blue-600",
};

function readiness(row: TeamRatingDashboardRow): string {
  return row.utrUrl && row.wtnUrl ? "Ready" : !row.utrUrl ? "Add UTR profile" : "Add WTN profile";
}

function sortValue(row: TeamRatingDashboardRow, key: SortKey): string | number | null {
  switch (key) {
    case "player": return row.displayName;
    case "utr": return row.utr;
    case "utrChange": return row.utrChange;
    case "utrCheckedAt": return row.utrCheckedAt;
    case "wtn": return row.wtn;
    case "wtnChange": return row.wtnChange;
    case "wtnCheckedAt": return row.wtnCheckedAt;
    case "status": return readiness(row);
  }
}

function SortHeader({ label, column, activeColumn, direction, onSort, className = "px-3 py-3" }: {
  label: string;
  column: SortKey;
  activeColumn: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeColumn === column;
  const Icon = active ? direction === "asc" ? ChevronUp : ChevronDown : ChevronsUpDown;
  return <th className={className} aria-sort={active ? direction === "asc" ? "ascending" : "descending" : "none"}>
    <button type="button" onClick={() => onSort(column)} className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold hover:text-text-primary">
      {label}<Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  </th>;
}

export default function TeamRatingsWorkspace({ rows, power6, loadError }: { rows: TeamRatingDashboardRow[]; power6: number | null; loadError?: string | null }) {
  const [sortKey, setSortKey] = useState<SortKey>("player");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const utrConfigured = rows.filter((row) => row.utrUrl).length;
  const wtnConfigured = rows.filter((row) => row.wtnUrl).length;
  const checkedRows = rows.filter((row) => row.utrCheckedAt || row.wtnCheckedAt);
  const latest = checkedRows.flatMap((row) => [row.utrCheckedAt, row.wtnCheckedAt]).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;
  const cards: Array<{ label: string; value: string | number; icon: LucideIcon; tone: CardTone }> = [
    { label: "Current players", value: rows.length, icon: Users, tone: "crimson" },
    { label: "UTR configured", value: utrConfigured, icon: CheckCircle2, tone: "research" },
    { label: "WTN configured", value: wtnConfigured, icon: CheckCircle2, tone: "success" },
    { label: "Denison Power 6 UTR", value: power6 == null ? "—" : power6.toFixed(2), icon: Gauge, tone: "info" },
    { label: "Needs profile", value: rows.filter((row) => !row.utrUrl || !row.wtnUrl).length, icon: AlertTriangle, tone: "warning" },
  ];
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const left = sortValue(a, sortKey);
    const right = sortValue(b, sortKey);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    const comparison = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? comparison : -comparison;
  }), [rows, sortDirection, sortKey]);

  function toggleSort(key: SortKey): void {
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  return <ModulePageShell title="Ratings" subtitle="Weekly UTR and WTN history for current Denison players" actions={<div className="flex flex-wrap gap-2"><RequestRatingsButton provider="utr" /><RequestRatingsButton provider="wtn" /></div>}>
    {loadError ? <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value: cardValue, icon: Icon, tone }) => <div key={label} className={`flex min-h-[94px] items-center justify-between gap-3 rounded-card border px-5 py-3.5 ${toneClass[tone]}`}>
        <div className="min-w-0"><p className={`text-[28px] leading-none font-semibold tabular-nums tracking-tight ${valueClass[tone]}`}>{cardValue}</p><p className="mt-1.5 text-[11px] font-medium tracking-wide text-text-secondary uppercase">{label}</p></div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${wellClass[tone]}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden /></span>
      </div>)}
    </div>
    <div className="rounded-card border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div><h2 className="text-base font-semibold text-text-primary">Team rating history</h2><p className="text-xs text-text-secondary">Automatic UTR and WTN check: Wednesday at 4:00 a.m. Eastern{latest ? ` · Latest snapshot ${checked(latest)}` : ""}</p></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-text-secondary"><tr>{([
          ["Player", "player", "px-4 py-3"], ["UTR", "utr"], ["UTR change", "utrChange"], ["UTR checked", "utrCheckedAt"],
          ["WTN", "wtn"], ["WTN change", "wtnChange"], ["WTN checked", "wtnCheckedAt"], ["Status", "status"],
        ] as Array<[string, SortKey, string?]>).map(([label, column, className]) => <SortHeader key={column} label={label} column={column} className={className} activeColumn={sortKey} direction={sortDirection} onSort={toggleSort}/>)}</tr></thead>
        <tbody>{sortedRows.map((row) => <tr key={row.personId} className="border-t border-border">
          <td className="px-4 py-2.5 text-sm font-semibold text-text-primary">{row.displayName}</td>
          <td className="px-3 py-2.5 tabular-nums">{value(row.utr)}</td>
          <td className={`px-3 py-2.5 font-semibold tabular-nums ${row.utrChange != null && row.utrChange > 0 ? "text-emerald-600" : row.utrChange != null && row.utrChange < 0 ? "text-red-600" : "text-text-secondary"}`}>{change(row.utrChange)}</td>
          <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{checked(row.utrCheckedAt)}</td>
          <td className="px-3 py-2.5 tabular-nums">{value(row.wtn)}</td>
          <td className={`px-3 py-2.5 font-semibold tabular-nums ${row.wtnChange != null && row.wtnChange < 0 ? "text-emerald-600" : row.wtnChange != null && row.wtnChange > 0 ? "text-red-600" : "text-text-secondary"}`}>{change(row.wtnChange)}</td>
          <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{checked(row.wtnCheckedAt)}</td>
          <td className="px-3 py-2.5"><Link href={playersCoachesPersonPath(row.personId)} className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold transition hover:brightness-95 ${row.utrUrl && row.wtnUrl ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{readiness(row)}</Link></td>
        </tr>)}</tbody>
      </table></div>
    </div>
  </ModulePageShell>;
}
