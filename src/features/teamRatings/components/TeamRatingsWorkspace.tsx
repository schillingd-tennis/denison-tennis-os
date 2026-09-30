import { AlertTriangle, CheckCircle2, History, Users } from "lucide-react";
import Link from "next/link";

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

export default function TeamRatingsWorkspace({ rows, loadError }: { rows: TeamRatingDashboardRow[]; loadError?: string | null }) {
  const configured = rows.filter((row) => row.utrUrl).length;
  const checkedRows = rows.filter((row) => row.utrCheckedAt);
  const latest = checkedRows.map((row) => row.utrCheckedAt!).sort().at(-1) ?? null;
  const cards = [
    ["Current players", rows.length, Users],
    ["UTR configured", configured, CheckCircle2],
    ["History started", checkedRows.length, History],
    ["Needs profile", rows.length - configured, AlertTriangle],
  ] as const;
  return <ModulePageShell title="Ratings" subtitle="Weekly UTR and WTN history for current Denison players" actions={<RequestRatingsButton />}>
    {loadError ? <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, count, Icon]) => <div key={label} className="rounded-card border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p><Icon className="h-4 w-4 text-[var(--module-accent)]" /></div>
        <p className="mt-2 text-2xl font-semibold text-text-primary">{count}</p>
      </div>)}
    </div>
    <div className="rounded-card border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div><h2 className="text-base font-semibold text-text-primary">Team rating history</h2><p className="text-xs text-text-secondary">Automatic UTR check: Wednesday at 4:00 a.m. Eastern{latest ? ` · Latest snapshot ${checked(latest)}` : ""}</p></div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">WTN adapter not configured</span>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Player</th><th className="px-3 py-3">UTR</th><th className="px-3 py-3">Weekly change</th><th className="px-3 py-3">Last checked</th><th className="px-3 py-3">WTN</th><th className="px-3 py-3">Status</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.personId} className="border-t border-border">
          <td className="px-4 py-3 font-semibold text-text-primary">{row.displayName}</td>
          <td className="px-3 py-3 tabular-nums">{value(row.utr)}</td>
          <td className={`px-3 py-3 font-semibold tabular-nums ${row.utrChange != null && row.utrChange > 0 ? "text-emerald-600" : row.utrChange != null && row.utrChange < 0 ? "text-red-600" : "text-text-secondary"}`}>{change(row.utrChange)}</td>
          <td className="px-3 py-3 text-text-secondary">{checked(row.utrCheckedAt)}</td>
          <td className="px-3 py-3 tabular-nums">{value(row.wtn)}</td>
          <td className="px-3 py-3"><Link href={playersCoachesPersonPath(row.personId)} className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold transition hover:brightness-95 ${row.utrUrl ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.utrUrl ? "Ready" : "Add UTR profile"}</Link></td>
        </tr>)}</tbody>
      </table></div>
    </div>
  </ModulePageShell>;
}
