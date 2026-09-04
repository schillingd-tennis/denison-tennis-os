"use client";

import { CalendarCheck2, CalendarDays, ChevronRight, Swords, Trophy } from "lucide-react";
import { useState } from "react";
import type { DailyPracticePlan, DayRuleSummary } from "../types";
import styles from "./dayRuleTracker.module.css";

const variance = (value: number) => value > 0 ? `+${value}` : String(value);

export default function DayRuleTracker({ summary, plans, onOpenPlan, onAddPlan }: { summary: DayRuleSummary; plans: DailyPracticePlan[]; onOpenPlan: (id: string) => void; onAddPlan: (date: string) => void }) {
  const currentMonth = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric" }).format(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(summary.rows.some((row) => row.month === currentMonth) ? currentMonth : summary.rows[0]?.month);
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const selected = summary.rows.find((row) => row.month === selectedMonth) ?? summary.rows[0];
  const monthPlans = [...plans].filter((plan) => Number(plan.planDate.slice(5, 7)) === selected?.month).sort((a, b) => a.planDate.localeCompare(b.planDate));

  function addDay(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setMessage("Choose a valid date."); return; }
    const existing = plans.find((plan) => plan.planDate === date);
    if (existing) onOpenPlan(existing.id);
    else onAddPlan(date);
  }

  return <div className="grid gap-3">
    <section className="rounded-card border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 sm:grid-cols-3"><div><p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">114-day rule</p><p className="mt-1 text-3xl font-semibold tabular-nums">{summary.used} <span className="text-base font-normal text-text-secondary">/ {summary.limit}</span></p></div><div className="rounded-control bg-blue-50 p-3"><p className="text-[10px] font-semibold tracking-wide text-blue-700 uppercase">Budget to date</p><p className="mt-1 text-xl font-semibold">{summary.budgetToDate}</p></div><div className={`rounded-control p-3 ${summary.varianceToDate < 0 ? "bg-red-50 text-danger" : "bg-emerald-50 text-success"}`}><p className="text-[10px] font-semibold tracking-wide uppercase">+/− to date</p><p className="mt-1 text-xl font-semibold">{variance(summary.varianceToDate)}</p><p className="text-[10px]">positive means under budget</p></div></div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full ${summary.remaining < 0 ? "bg-danger" : "bg-[var(--module-accent)]"}`} style={{ width: `${Math.min(100, summary.used / summary.limit * 100)}%` }}/></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[42rem] text-left"><thead><tr className="border-b border-border text-[10px] font-semibold tracking-wide text-text-secondary uppercase"><th className="py-2">Month</th><th>Budget</th><th>Used</th><th>Month +/−</th><th>Budget to date</th><th>To-date +/−</th><th className="w-1/5">Usage</th></tr></thead><tbody>{summary.rows.map((row) => <tr key={row.month} className={`cursor-pointer border-b border-border/70 text-xs ${selectedMonth === row.month ? "bg-blue-50" : "hover:bg-app-background"}`} onClick={() => setSelectedMonth(row.month)}><td className="py-2.5"><button type="button" className="font-semibold text-blue-700 hover:underline">{row.label}</button></td><td>{row.budget}</td><td>{row.used}</td><td className={row.variance < 0 ? "font-semibold text-danger" : "font-semibold text-success"}>{variance(row.variance)}</td><td>{row.budgetToDate}</td><td className={row.varianceToDate < 0 ? "font-semibold text-danger" : "font-semibold text-success"}>{variance(row.varianceToDate)}</td><td><div className="h-1.5 rounded-full bg-border"><div className={`h-full rounded-full ${row.variance < 0 ? "bg-danger" : "bg-blue-600"}`} style={{ width: `${Math.min(100, row.budget ? row.used / row.budget * 100 : 0)}%` }}/></div></td></tr>)}</tbody></table></div>
    </section>
    <div className={styles.detailGrid}>
      <section className="rounded-card border border-blue-200 bg-surface p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold tracking-wide text-blue-700 uppercase">Counted days</p><h2 className="mt-1 text-lg font-semibold">{selected?.label} <span className="font-normal text-text-secondary">· {selected?.used ?? 0} days</span></h2></div><CalendarDays className="h-5 w-5 text-blue-600"/></div><div className="mt-3 divide-y divide-border">{selected?.days.length ? selected.days.map((day) => <div key={day.date} className="grid gap-2 py-3 sm:grid-cols-[7rem_1fr]"><span className="text-xs font-semibold tabular-nums">{day.date}</span><div className="flex flex-wrap gap-1.5">{day.sources.map((source, index) => <span key={`${source.type}-${source.label}-${index}`} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${source.type === "practice" ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-900"}`}>{source.type === "practice" ? <Swords className="h-3 w-3"/> : <Trophy className="h-3 w-3"/>}{source.type === "practice" ? "Practice" : "Competition"}: {source.label}</span>)}</div></div>) : <p className="py-8 text-center text-xs text-text-secondary">No counted days in {selected?.label}.</p>}</div></section>
      <section className="rounded-card border border-border bg-surface p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Daily Plans</h2><p className="mt-0.5 text-xs text-text-secondary">Plans for {selected?.label}. Select one to open it.</p></div><CalendarCheck2 className="h-5 w-5 text-violet-600"/></div>
        <form className="mt-3 flex gap-2" onSubmit={addDay}><input required type="date" value={date} onChange={(event) => { setDate(event.target.value); setMessage(""); }} className="h-10 min-w-0 flex-1 rounded-control border border-border px-3 text-xs"/><button className="rounded-control bg-[var(--module-accent)] px-4 text-xs font-semibold text-white">Add Day</button></form>{message ? <p className="mt-2 text-xs text-danger">{message}</p> : null}
        <div className="mt-3 max-h-72 divide-y divide-border overflow-y-auto">{monthPlans.length ? monthPlans.map((plan) => <button key={plan.id} type="button" onClick={() => onOpenPlan(plan.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-app-background"><span className="min-w-0 flex-1"><span className="block text-xs font-bold tabular-nums">{plan.planDate}</span><span className="mt-0.5 block truncate text-[11px] text-text-secondary">{plan.title} · {plan.drills.length} drills</span></span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${plan.countable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{plan.countable ? "Countable" : "Not counted"}</span><ChevronRight className="h-4 w-4 text-text-secondary"/></button>) : <p className="py-8 text-center text-xs text-text-secondary">No Daily Plans in {selected?.label}.</p>}</div>
      </section>
    </div>
  </div>;
}
