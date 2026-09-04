import Link from "next/link";
import type { DayRuleSummary } from "../types";

export default function HomeDayRuleCard({ summary }: { summary: DayRuleSummary }) {
  return <section className="rounded-card border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
    <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Team Operations</p><h2 className="mt-1 text-lg font-semibold">114-Day Rule</h2></div><Link href="/team-operations/practice" className="text-xs font-semibold text-[var(--module-accent)]">Open tracker</Link></div>
    <div className="mt-4 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tabular-nums">{summary.used}<span className="text-base font-normal text-text-secondary"> / 114</span></p><p className={`text-sm font-semibold ${summary.remaining < 0 ? "text-danger" : "text-success"}`}>{summary.remaining >= 0 ? `+${summary.remaining} remaining` : `${summary.remaining} over`}</p></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full ${summary.remaining < 0 ? "bg-danger" : "bg-operations"}`} style={{ width: `${Math.min(100, summary.used / 114 * 100)}%` }}/></div>
    <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">{summary.rows.map((row) => <div key={row.month} className="text-center"><div className="flex h-16 items-end overflow-hidden rounded bg-app-background"><div className={`w-full ${row.variance < 0 ? "bg-danger" : "bg-operations"}`} style={{ height: `${Math.max(4, Math.min(100, row.used / row.budget * 100))}%` }}/></div><p className="mt-1 text-[10px] font-semibold">{row.label.slice(0,3)}</p><p className={`text-[10px] ${row.variance < 0 ? "text-danger" : "text-text-secondary"}`}>{row.used}/{row.budget}</p></div>)}</div>
    <p className="mt-4 text-xs text-text-secondary">Planned monthly budget: {summary.budgetTotal} days—aligned with the annual limit.</p>
  </section>;
}
