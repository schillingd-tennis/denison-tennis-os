"use client";

import { CalendarCheck2, CalendarDays, ChevronRight, Clock3, Library, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import { TEAM_OPERATIONS_ROUTE, TEAM_OPERATIONS_SCHEDULE_ROUTE } from "@/lib/module-routes";
import ScheduleIdentityMark from "@/features/teamSchedule/components/ScheduleIdentityMark";
import { resolveScheduleIdentityFromLabel, type ScheduleIdentity } from "@/features/teamSchedule/schoolIdentity";

import { PRACTICE_TABS, type PracticeCompetitionDate, type PracticeDrill, type PracticeTab } from "../types";
import type { DailyPracticePlan, DayRuleSummary } from "../types";
import DayRuleTracker from "./DayRuleTracker";
import DailyPlanBuilder from "./DailyPlanBuilder";
import EditableDrillLibrary from "./DrillLibrary";

const cardClass = "rounded-card border border-border bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export function DailyPlanPreview({ drillCount, nextCompetition }: { drillCount: number; nextCompetition?: PracticeCompetitionDate }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)]">
      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5">
          <div><p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Today</p><h2 className="mt-0.5 text-base font-semibold">Daily Practice Plan</h2></div>
          <span className="rounded-full bg-[var(--module-tint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--module-accent)]">Draft</span>
        </div>
        <div className="divide-y divide-border">
          {[
            ["2:45 PM", "Team meeting & objectives", "10 min"],
            ["2:55 PM", "Dynamic warm-up", "15 min"],
            ["3:10 PM", "Technical block", "35 min"],
            ["3:45 PM", "Competitive block", "45 min"],
            ["4:30 PM", "Team points & finish", "30 min"],
          ].map(([time, title, duration], index) => (
            <div key={title} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 px-4 py-3 sm:px-5">
              <span className="text-xs tabular-nums text-text-secondary">{time}</span>
              <div className="flex min-w-0 items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--module-tint)] text-[11px] font-bold text-[var(--module-accent)]">{index + 1}</span><span className="truncate text-sm font-semibold">{title}</span></div>
              <span className="text-xs text-text-secondary">{duration}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <section className={`${cardClass} p-4`}><div className="flex items-center gap-2 text-text-secondary"><Clock3 className="h-4 w-4"/><span className="text-[11px] font-semibold tracking-wide uppercase">Practice window</span></div><p className="mt-3 text-xl font-semibold">2:45–5:00 PM</p><p className="mt-1 text-xs text-text-secondary">Mitchell Center Courts</p></section>
        <section className={`${cardClass} p-4`}><div className="flex items-center gap-2 text-text-secondary"><Library className="h-4 w-4"/><span className="text-[11px] font-semibold tracking-wide uppercase">Drill library</span></div><p className="mt-3 text-xl font-semibold">{drillCount}</p><p className="mt-1 text-xs text-text-secondary">Imported drills ready to plan</p></section>
        <section className={`${cardClass} p-4 sm:col-span-2 lg:col-span-1`}><div className="flex items-center gap-2 text-text-secondary"><CalendarDays className="h-4 w-4"/><span className="text-[11px] font-semibold tracking-wide uppercase">Next competition</span></div><p className="mt-3 text-sm font-semibold">{nextCompetition?.label ?? "No competition scheduled"}</p>{nextCompetition ? <p className="mt-1 text-xs text-text-secondary">{formatDate(nextCompetition.date)} · {nextCompetition.location}</p> : null}</section>
      </div>
    </div>
  );
}

export function LegacyDrillLibrary({ drills }: { drills: PracticeDrill[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...new Set(drills.map((drill) => drill.category || "Uncategorized"))], [drills]);
  const filtered = useMemo(() => drills.filter((drill) => {
    const matchesCategory = category === "All" || (drill.category || "Uncategorized") === category;
    const haystack = [drill.name, drill.description, drill.sourceTags, drill.notes].join(" ").toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  }), [category, drills, query]);
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div><h2 className="text-sm font-semibold">Drill Library <span className="ml-1 font-normal text-text-secondary">{filtered.length}</span></h2><p className="mt-0.5 text-xs text-text-secondary">Search the imported coaching library by name, tag, or description.</p></div>
        <div className="flex gap-2"><label className="relative min-w-0 flex-1 sm:w-56"><Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-text-secondary"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search drills…" aria-label="Search drills" className="h-9 w-full rounded-control border border-border bg-surface pr-3 pl-9 text-xs outline-none focus:border-[var(--module-accent)]"/></label><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter drill category" className="h-9 rounded-control border border-border bg-surface px-2 text-xs font-semibold">{categories.map((value) => <option key={value}>{value}</option>)}</select></div>
      </div>
      {filtered.length === 0 ? <div className="p-4"><EmptyState title="No drills found" description="Try another search or category."/></div> : (
        <div className="divide-y divide-border">
          {filtered.map((drill) => <article key={drill.id} className="grid gap-2 px-4 py-3.5 hover:bg-app-background/60 md:grid-cols-[minmax(12rem,0.7fr)_minmax(16rem,1.3fr)_minmax(10rem,0.7fr)_4rem] md:items-start">
            <div><h3 className="text-sm font-semibold text-text-primary">{drill.name}</h3><span className="mt-1 inline-flex rounded-full bg-[var(--module-tint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--module-accent)]">{drill.category || "Uncategorized"}</span></div>
            <p className="text-xs leading-5 text-text-secondary">{drill.description || "No description provided."}</p>
            <div className="flex flex-wrap gap-1">{drill.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary">{tag}</span>)}</div>
            <div className="text-left md:text-right"><span className="text-[10px] font-semibold tracking-wide text-text-secondary uppercase">Freq.</span><p className="text-sm font-semibold tabular-nums">{drill.frequency || "—"}</p></div>
          </article>)}
        </div>
      )}
    </section>
  );
}

function CompetitionDates({ dates }: { dates: PracticeCompetitionDate[] }) {
  return <section className={`${cardClass} overflow-hidden`}><div className="flex items-center justify-between border-b border-border px-4 py-3.5"><div><h2 className="text-sm font-semibold">Dates of Competition</h2><p className="mt-0.5 text-xs text-text-secondary">Shared from the Team Match Schedule—one source of truth.</p></div><Link href={TEAM_OPERATIONS_SCHEDULE_ROUTE} className="text-xs font-semibold text-[var(--module-accent)]">Open Schedule</Link></div>{dates.length === 0 ? <div className="p-4"><EmptyState title="No competition dates" description="Countable dates from Schedule will appear here."/></div> : <div className="divide-y divide-border">{dates.map((item) => <div key={item.id} className="grid grid-cols-[3.5rem_1fr] gap-3 px-4 py-3 sm:grid-cols-[3.5rem_8rem_minmax(12rem,1fr)_1fr_5rem] sm:items-center"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--module-tint)] text-xs font-bold text-[var(--module-accent)]">{item.dateNumber ?? item.dateGroup ?? "—"}</span><span className="text-xs font-semibold">{formatDate(item.date)}</span><span className="flex min-w-0 items-center gap-3"><ScheduleIdentityMark identity={competitionIdentity(item.label)} size={36}/><span className="truncate text-sm font-semibold">{item.label}</span></span><span className="text-xs text-text-secondary">{item.location}</span><span className="text-[10px] font-semibold tracking-wide text-text-secondary uppercase">{item.status}</span></div>)}</div>}</section>;
}

function competitionIdentity(label: string): ScheduleIdentity {
  const resolved = resolveScheduleIdentityFromLabel(label);
  if (resolved) return resolved;
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "—";
  return { slug: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, initials, logoSrc: null, kind: "generic", accentColor: "#6b7280" };
}

function PracticeLog({ plans, dayRule, onOpenPlan }: { plans: DailyPracticePlan[]; dayRule: DayRuleSummary; onOpenPlan: (id: string) => void }) {
  const ordered = [...plans].sort((a, b) => b.planDate.localeCompare(a.planDate));
  const countablePlans = plans.filter((plan) => plan.countable).length;
  const countedDates = [...new Set(dayRule.rows.flatMap((row) => row.days.map((day) => day.date)))].sort();
  const runningCount = (date: string) => countedDates.filter((countedDate) => countedDate <= date).length;
  return <section className={`${cardClass} overflow-hidden`}>
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div><div className="flex items-center gap-2"><h2 className="text-base font-semibold">Practice Log</h2><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">{plans.length} plans</span></div><p className="mt-0.5 text-xs text-text-secondary">Complete Daily Plan history. Select any row to open it.</p></div>
      <div className="flex flex-wrap gap-2"><span className="rounded-control border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">{countablePlans} countable plans</span><span className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">114 count: {dayRule.used}/{dayRule.limit} · {dayRule.remaining} left</span></div>
    </div>
    {ordered.length === 0 ? <div className="p-5"><EmptyState title="No Daily Plans yet" description="Saved Daily Plans will appear here automatically."/></div> : <div className="overflow-x-auto"><table className="w-full min-w-[70rem] table-fixed text-left"><thead className="bg-app-background"><tr className="border-b border-border text-[9px] font-bold tracking-wider text-text-secondary uppercase"><th className="w-28 px-4 py-2">Date</th><th className="w-28 px-3 py-2">Time</th><th className="w-44 px-3 py-2">Plan</th><th className="w-52 px-3 py-2">Focus / announcements</th><th className="w-40 px-3 py-2">Location</th><th className="w-16 px-3 py-2">Drills</th><th className="w-28 px-3 py-2">114 status</th><th className="w-24 px-3 py-2">Year count</th><th className="w-24 px-3 py-2">Status</th><th className="w-8 px-2 py-2"><span className="sr-only">Open</span></th></tr></thead><tbody>{ordered.map((plan) => <tr key={plan.id} role="button" tabIndex={0} onClick={() => onOpenPlan(plan.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenPlan(plan.id); } }} className="cursor-pointer border-b border-border/70 text-xs transition-colors hover:bg-blue-50/60 focus:bg-blue-50 focus:outline-none">
      <td className="px-4 py-2.5 font-semibold tabular-nums text-text-primary">{formatDate(plan.planDate)}</td><td className="px-3 py-2.5 tabular-nums text-text-secondary">{plan.startTime || "TBD"}{plan.endTime ? `–${plan.endTime}` : ""}</td><td className="truncate px-3 py-2.5 font-semibold text-text-primary">{plan.title}</td><td className="truncate px-3 py-2.5 text-text-secondary">{plan.focus || plan.announcements || "—"}</td><td className="truncate px-3 py-2.5 text-text-secondary">{plan.location || "—"}</td><td className="px-3 py-2.5 font-semibold tabular-nums">{plan.drills.length}</td><td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${plan.countable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}><CalendarCheck2 className="h-3 w-3"/>{plan.countable ? "Countable" : "Not counted"}</span></td><td className="px-3 py-2.5 font-semibold tabular-nums">{runningCount(plan.planDate)} / {dayRule.limit}</td><td className="px-3 py-2.5 text-[10px] font-semibold tracking-wide text-text-secondary uppercase">{plan.status}</td><td className="px-2 py-2.5"><ChevronRight className="h-4 w-4 text-text-secondary"/></td>
    </tr>)}</tbody></table></div>}
  </section>;
}

export default function PracticeDashboard({ drills, competitionDates, dayRule, plans, loadError }: { drills: PracticeDrill[]; competitionDates: PracticeCompetitionDate[]; dayRule: DayRuleSummary; plans: DailyPracticePlan[]; loadError: string | null }) {
  const [activeTab, setActiveTab] = useState<PracticeTab>("daily-plan");
  const [openedPlanId, setOpenedPlanId] = useState<string | null>(null);
  const [newPlanDate, setNewPlanDate] = useState<string | null>(null);
  return <ModulePageShell title="Practice" subtitle="Build daily plans, organize drills, and manage the rhythm of the season.">
    <nav className="text-xs text-text-secondary" aria-label="Breadcrumb"><Link href={TEAM_OPERATIONS_ROUTE} className="hover:text-text-primary">Team Operations</Link><span className="mx-1.5">›</span><span className="text-text-primary">Practice</span></nav>
    {loadError ? <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{loadError}</p> : null}
    <nav aria-label="Practice sections" className="flex max-w-full gap-1 overflow-x-auto rounded-card border border-border bg-surface p-1 shadow-[0_4px_14px_rgba(17,24,39,0.03)]">{PRACTICE_TABS.map((tab) => <button key={tab.id} type="button" onClick={() => { if (tab.id === "daily-plan") { setOpenedPlanId(null); setNewPlanDate(null); } setActiveTab(tab.id); }} aria-current={activeTab === tab.id ? "page" : undefined} className={`min-h-9 shrink-0 rounded-control px-3 text-xs font-semibold transition-colors sm:px-4 ${activeTab === tab.id ? "bg-[var(--module-accent)] text-white" : "text-text-secondary hover:bg-app-background hover:text-text-primary"}`}>{tab.label}</button>)}</nav>
    {activeTab === "daily-plan" ? <DailyPlanBuilder key={openedPlanId ?? newPlanDate ?? "today"} drills={drills} plans={plans} dayRule={dayRule} initialPlanId={openedPlanId} initialPlanDate={newPlanDate}/> : null}
    {activeTab === "drills" ? <EditableDrillLibrary drills={drills}/> : null}
    {activeTab === "dates-of-competition" ? <CompetitionDates dates={competitionDates}/> : null}
    {activeTab === "114-day-tracker" ? <DayRuleTracker summary={dayRule} plans={plans} onOpenPlan={(id) => { setNewPlanDate(null); setOpenedPlanId(id); setActiveTab("daily-plan"); }} onAddPlan={(date) => { setOpenedPlanId(null); setNewPlanDate(date); setActiveTab("daily-plan"); }}/> : null}
    {activeTab === "practice-log" ? <PracticeLog plans={plans} dayRule={dayRule} onOpenPlan={(id) => { setNewPlanDate(null); setOpenedPlanId(id); setActiveTab("daily-plan"); }}/> : null}
  </ModulePageShell>;
}
