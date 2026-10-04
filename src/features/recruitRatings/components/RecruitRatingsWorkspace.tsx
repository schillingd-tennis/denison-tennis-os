import Link from "next/link";
import { AlertTriangle, CheckCircle2, History, Users } from "lucide-react";

import ModulePageShell from "@/components/ModulePageShell";
import { recruitingPersonPath } from "@/lib/module-routes";

import type { RecruitRatingDashboardRow } from "../types";
import RequestRecruitRatingsButton from "./RequestRecruitRatingsButton";

function metric(value: number | null, digits = 2): string {
  return value == null ? "—" : value.toFixed(digits);
}

function change(value: number | null, inverse = false): string {
  if (value == null) return "—";
  const normalized = inverse ? -value : value;
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(2)}`;
}

function changeTone(value: number | null, inverse = false): string {
  if (value == null || value === 0) return "text-text-secondary";
  const improved = inverse ? value < 0 : value > 0;
  return improved ? "text-emerald-600" : "text-red-600";
}

function checked(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Not checked";
}

export default function RecruitRatingsWorkspace({ rows, loadError }: { rows: RecruitRatingDashboardRow[]; loadError?: string | null }) {
  const configured = (provider: "utrUrl" | "wtnUrl" | "trnUrl") => rows.filter((row) => row[provider]).length;
  const complete = rows.filter((row) => row.utrUrl && row.wtnUrl && row.trnUrl).length;
  const latest = rows.flatMap((row) => [row.utrCheckedAt, row.wtnCheckedAt, row.trnCheckedAt]).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;
  const cards = [
    { label: "1 - Elite recruits", value: rows.length, icon: Users, tone: "border-slate-200 bg-slate-50 text-slate-700" },
    { label: "UTR configured", value: configured("utrUrl"), icon: CheckCircle2, tone: "border-blue-200 bg-blue-50 text-blue-700" },
    { label: "WTN configured", value: configured("wtnUrl"), icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    { label: "TRN configured", value: configured("trnUrl"), icon: CheckCircle2, tone: "border-violet-200 bg-violet-50 text-violet-700" },
    { label: "Needs profile", value: rows.length - complete, icon: AlertTriangle, tone: "border-amber-200 bg-amber-50 text-amber-700" },
  ];

  return (
    <ModulePageShell
      title="Elite Recruit Ratings"
      subtitle="Weekly UTR, WTN, and TennisRecruiting.net history for Priority 1 recruits"
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
            <thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase"><tr><th className="px-3 py-2.5">Recruit</th><th className="px-3 py-2.5">Class</th><th className="px-3 py-2.5">Profiles</th><th className="px-3 py-2.5">UTR</th><th className="px-3 py-2.5">Change</th><th className="px-3 py-2.5">Checked</th><th className="px-3 py-2.5">WTN</th><th className="px-3 py-2.5">Change</th><th className="px-3 py-2.5">Checked</th><th className="px-3 py-2.5">TRN</th><th className="px-3 py-2.5">Change</th><th className="px-3 py-2.5">Stars</th><th className="px-3 py-2.5">Checked</th></tr></thead>
            <tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.personId} className="hover:bg-app-background/50"><td className="px-3 py-3"><Link className="font-semibold hover:underline" href={recruitingPersonPath(row.personId)}>{row.displayName}</Link></td><td className="px-3 py-3 tabular-nums">{row.classYear}</td><td className="px-3 py-3"><div className="flex gap-1">{([["UTR", row.utrUrl], ["WTN", row.wtnUrl], ["TRN", row.trnUrl]] as const).map(([label, url]) => <span key={label} className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${url ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{label}</span>)}</div></td><td className="px-3 py-3 tabular-nums">{metric(row.utr)}</td><td className={`px-3 py-3 font-semibold tabular-nums ${changeTone(row.utrChange)}`}>{change(row.utrChange)}</td><td className="px-3 py-3 whitespace-nowrap text-text-secondary">{checked(row.utrCheckedAt)}</td><td className="px-3 py-3 tabular-nums">{metric(row.wtn)}</td><td className={`px-3 py-3 font-semibold tabular-nums ${changeTone(row.wtnChange, true)}`}>{change(row.wtnChange, true)}</td><td className="px-3 py-3 whitespace-nowrap text-text-secondary">{checked(row.wtnCheckedAt)}</td><td className="px-3 py-3 tabular-nums">{row.trnRank == null ? "—" : `#${Math.round(row.trnRank)}`}</td><td className={`px-3 py-3 font-semibold tabular-nums ${changeTone(row.trnChange, true)}`}>{change(row.trnChange, true)}</td><td className="px-3 py-3">{row.trnStarRating == null ? "—" : `${row.trnStarRating}★`}</td><td className="px-3 py-3 whitespace-nowrap text-text-secondary">{checked(row.trnCheckedAt)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </ModulePageShell>
  );
}
