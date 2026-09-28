"use client";

import { useMemo, useState } from "react";
import { Award, BookOpenCheck, Clock3, GraduationCap, Plus, Search } from "lucide-react";

import ModulePageShell from "@/components/ModulePageShell";
import { modulePrimaryButtonClass } from "@/components/module-theme";
import type { Person } from "@/features/people/types";
import { getDisplayName } from "@/features/people/utils";

import { buildGradeRows, gpaStatus, teamWeightedGpa, weightedGpa, type GradePlayerRow } from "../calculations";
import type { AcademicRecord, AcademicTerm, ClassLevel, GradeView, RosterView } from "../types";
import GradeEntryDialog from "./GradeEntryDialog";

type Filter = "all" | ClassLevel | "dean" | "watch";
type SortKey = "name" | "class" | "hours" | "primary" | "midterm" | "year" | "cumulative" | "status";

function gpaText(value: number | null): string { return value == null ? "—" : value.toFixed(2); }
function gpaTone(value: number | null): string {
  if (value == null) return "text-text-secondary";
  if (value >= 3.7) return "text-emerald-600";
  if (value >= 3) return "text-text-primary";
  if (value >= 2.75) return "text-amber-600";
  return "text-red-700";
}
function badgeClass(status: string): string {
  if (status === "Dean's List") return "bg-emerald-50 text-emerald-700";
  if (status === "Honor Roll") return "bg-blue-50 text-blue-700";
  if (status === "Below 3.0") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function TrendChart({ terms, records }: { terms: AcademicTerm[]; records: AcademicRecord[] }) {
  const ordered = [...terms].sort((a, b) => a.sortOrder - b.sortOrder);
  if (!ordered.length) return <p className="py-8 text-center text-sm text-text-secondary">No semester trend data yet.</p>;
  const width = 900;
  const plotLeft = 54;
  const plotRight = 878;
  const plotTop = 25;
  const plotBottom = 164;
  const plotWidth = plotRight - plotLeft;
  const points = ordered.map((term, index) => {
    const rows = records.filter((record) => record.termId === term.id);
    const cumulative = records.filter((record) =>
      ordered.slice(0, index + 1).some((candidate) => candidate.id === record.termId),
    );
    return {
      term,
      x: ordered.length === 1 ? plotLeft + plotWidth / 2 : plotLeft + (index / (ordered.length - 1)) * plotWidth,
      semester: weightedGpa(rows),
      cumulative: weightedGpa(cumulative),
    };
  });
  const y = (gpa: number | null) => plotBottom - (((gpa ?? 2) - 2) / 2) * (plotBottom - plotTop);
  const path = (key: "semester" | "cumulative") => points
    .filter((point) => point[key] != null)
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${y(point[key])}`)
    .join(" ");
  const gridValues = [4, 3.5, 3, 2.5, 2];

  return <div className="overflow-x-auto pt-2">
    <svg viewBox={`0 0 ${width} 225`} className="h-auto min-w-[720px] w-full" role="img" aria-labelledby="gpa-trend-title gpa-trend-description">
      <title id="gpa-trend-title">Team GPA trend</title>
      <desc id="gpa-trend-description">Semester and cumulative team GPA by academic term on a two point zero to four point zero scale.</desc>
      {gridValues.map((value) => <g key={value}>
        <line x1={plotLeft} y1={y(value)} x2={plotRight} y2={y(value)} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
        <text x={plotLeft - 12} y={y(value) + 4} fontSize="11" textAnchor="end" fill="currentColor" opacity="0.65">{value.toFixed(1)}</text>
      </g>)}
      <path d={path("semester")} fill="none" stroke="var(--module-accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <path d={path("cumulative")} fill="none" stroke="var(--color-info)" strokeWidth="2.5" strokeDasharray="7 6" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point) => {
        const [season, year = ""] = point.term.label.split(" ");
        return <g key={point.term.id}>
          {point.semester != null ? <>
            <circle cx={point.x} cy={y(point.semester)} r="5" fill="var(--module-accent)" stroke="white" strokeWidth="2" />
            <text x={point.x} y={Math.max(plotTop + 10, y(point.semester) - 10)} fontSize="11" fontWeight="600" textAnchor="middle" fill="currentColor">{point.semester.toFixed(2)}</text>
          </> : null}
          <text x={point.x} y="188" fontSize="11" fontWeight="600" textAnchor="middle" fill="currentColor">
            <tspan x={point.x}>{season}</tspan>
            <tspan x={point.x} dy="14" fontWeight="400" opacity="0.7">{year ? `'${year.slice(-2)}` : ""}</tspan>
          </text>
        </g>;
      })}
    </svg>
    <div className="flex justify-center gap-5 text-xs text-text-secondary"><span><b className="text-[var(--module-accent)]">—</b> Semester GPA</span><span><b className="text-[var(--color-info)]">- -</b> Cumulative GPA</span></div>
  </div>;
}

export default function TeamGradesWorkspace({ people, terms, records, loadError = null }: { people: Person[]; terms: AcademicTerm[]; records: AcademicRecord[]; loadError?: string | null }) {
  const orderedTerms = useMemo(() => [...terms].sort((a, b) => b.sortOrder - a.sortOrder), [terms]);
  const years = [...new Set(orderedTerms.map((term) => term.academicYear))];
  const [view, setView] = useState<GradeView>({ kind: "all" });
  const [rosterView, setRosterView] = useState<RosterView>("active");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [selected, setSelected] = useState<GradePlayerRow | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const rows = useMemo(() => buildGradeRows({ people, terms, records, view, rosterView }), [people, terms, records, view, rosterView]);
  const shown = useMemo(() => rows.filter((row) => {
    if (query && !getDisplayName(row.person).toLowerCase().includes(query.toLowerCase())) return false;
    if (["SR", "JR", "SO", "FR"].includes(filter) && row.classLevel !== filter) return false;
    if (filter === "dean" && gpaStatus(row.primaryGpa, row.hours) !== "Dean's List") return false;
    if (filter === "watch" && (row.primaryGpa == null || row.primaryGpa >= 3)) return false;
    return true;
  }).sort((a, b) => {
    const value = (row: GradePlayerRow): string | number => sortKey === "name" ? row.person.lastName : sortKey === "class" ? row.classLevel : sortKey === "hours" ? row.hours : sortKey === "primary" ? row.primaryGpa ?? -1 : sortKey === "midterm" ? row.midtermGpa ?? -1 : sortKey === "year" ? row.yearGpa ?? -1 : sortKey === "cumulative" ? row.cumulativeGpa ?? -1 : gpaStatus(row.primaryGpa, row.hours);
    const av = value(a); const bv = value(b); if (av < bv) return -sortDir; if (av > bv) return sortDir; return 0;
  }), [rows, query, filter, sortKey, sortDir]);
  const primary = teamWeightedGpa(shown);
  const totalHours = shown.reduce((sum, row) => sum + row.hours, 0);
  const shownIds = new Set(shown.map((row) => row.person.id));
  const cumulative = weightedGpa(records.filter((record) => shownIds.has(record.personId)));
  const dean = shown.filter((row) => gpaStatus(row.primaryGpa, row.hours) === "Dean's List").length;
  const watch = shown.filter((row) => (row.primaryGpa ?? 4) < 3).length;
  const viewLabel = view.kind === "all" ? "All Time" : view.kind === "term" ? terms.find((term) => term.id === view.id)?.label ?? "Semester" : view.academicYear;
  function setSort(next: SortKey) { if (sortKey === next) setSortDir((current) => current === 1 ? -1 : 1); else { setSortKey(next); setSortDir(1); } }
  const tab = (active: boolean) => `h-9 rounded-control px-3 text-xs font-semibold ${active ? "bg-[var(--module-accent)] text-white" : "border border-border bg-surface text-text-secondary hover:text-text-primary"}`;

  return <ModulePageShell title="Grades" subtitle="Academic GPA reporting for Denison men’s tennis" actions={<button type="button" onClick={() => setEntryOpen(true)} className={`${modulePrimaryButtonClass} gap-2`}><Plus className="h-4 w-4" /> Add Grades</button>}>
    {loadError ? <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{loadError}</p> : null}
    <div className="grid gap-2 rounded-card border border-[var(--module-border)] bg-gradient-to-br from-[var(--module-tint)] via-surface to-surface p-3 shadow-[0_8px_22px_rgba(17,24,39,0.04)]">
      <div className="flex flex-wrap gap-1.5"><button className={tab(view.kind === "all")} onClick={() => setView({ kind: "all" })}>All Time</button>{orderedTerms.map((term) => <button key={term.id} className={tab(view.kind === "term" && view.id === term.id)} onClick={() => setView({ kind: "term", id: term.id })}>{term.label}</button>)}</div>
      <div className="flex flex-wrap gap-1.5 border-t border-border pt-2"><button className={tab(view.kind === "all")} onClick={() => setView({ kind: "all" })}>All Time</button>{years.map((year) => <button key={year} className={tab(view.kind === "year" && view.academicYear === year)} onClick={() => setView({ kind: "year", academicYear: year })}>{year}</button>)}</div>
      <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">{(["all", "active", "inactive"] as const).map((id) => <button key={id} className={tab(rosterView === id)} onClick={() => setRosterView(id)}>{id === "all" ? "All Players" : id === "active" ? "● Active Roster" : "○ Non-Active"}</button>)}</div>
    </div>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { label: "Team GPA", value: gpaText(primary), icon: GraduationCap, card: "border-rose-200 bg-gradient-to-br from-rose-50 to-white", iconTone: "bg-rose-100 text-[var(--module-accent)]" },
      { label: "Cumulative GPA", value: gpaText(cumulative), icon: BookOpenCheck, card: "border-blue-200 bg-gradient-to-br from-blue-50 to-white", iconTone: "bg-blue-100 text-blue-700" },
      { label: "Dean's List / Below 3.0", value: `${dean} / ${watch}`, icon: Award, card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white", iconTone: "bg-emerald-100 text-emerald-700" },
      { label: "Total Credit Hours", value: totalHours.toFixed(1), icon: Clock3, card: "border-amber-200 bg-gradient-to-br from-amber-50 to-white", iconTone: "bg-amber-100 text-amber-700" },
    ].map(({ label, value, icon: Icon, card, iconTone }) => <div key={label} className={`rounded-card border p-4 shadow-[0_6px_18px_rgba(17,24,39,0.04)] ${card}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-full ${iconTone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-1 text-xs text-text-secondary">{viewLabel}</p></div>)}</section>
    <section><h2 className="mb-2 text-sm font-semibold">By Class Year</h2><div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{(["SR", "JR", "SO", "FR"] as const).map((level, index) => { const classRows = shown.filter((row) => row.classLevel === level); const classIds = new Set(classRows.map((row) => row.person.id)); const tones = ["border-violet-200 bg-violet-50/60", "border-blue-200 bg-blue-50/60", "border-emerald-200 bg-emerald-50/60", "border-amber-200 bg-amber-50/60"]; return <div key={level} className={`rounded-card border p-3 ${tones[index]}`}><p className="text-xs font-semibold text-text-secondary">{level}</p><p className={`mt-1 text-xl font-semibold ${gpaTone(teamWeightedGpa(classRows))}`}>{gpaText(teamWeightedGpa(classRows))}</p><p className="text-xs text-text-secondary">Cumulative {gpaText(weightedGpa(records.filter((record) => classIds.has(record.personId))))} · {classRows.length} players</p></div>; })}</div></section>
    <section className="rounded-card border border-blue-100 bg-gradient-to-b from-blue-50/45 to-surface p-4 shadow-[0_8px_22px_rgba(17,24,39,0.04)]"><h2 className="text-sm font-semibold">Team GPA Trend</h2><p className="mt-0.5 text-xs text-text-secondary">Semester performance compared with the cumulative team average</p><TrendChart terms={terms} records={records} /></section>
    <div className="flex flex-wrap gap-2"><div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players…" className="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-3 text-sm" /></div>{(["all", "SR", "JR", "SO", "FR", "dean", "watch"] as Filter[]).map((id) => <button key={id} className={tab(filter === id)} onClick={() => setFilter(id)}>{id === "all" ? "All" : id === "dean" ? "★ Dean's List" : id === "watch" ? "⚠ Watch" : id}</button>)}</div>
    <section className="overflow-hidden rounded-card border border-[var(--module-border)] bg-surface shadow-[0_8px_22px_rgba(17,24,39,0.04)]"><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-[var(--module-border)] bg-[var(--module-tint)] text-[11px] uppercase text-text-secondary"><tr>{[["Player", "name"], ["Yr", "class"], ["Hrs", "hours"], [view.kind === "all" ? "Primary GPA" : view.kind === "term" ? "Sem GPA" : "Yr GPA", "primary"], ["Midterm GPA", "midterm"], ["Yr GPA", "year"], ["Cum GPA", "cumulative"], ["Status", "status"]].map(([label, key]) => <th key={key} className="px-3 py-2.5"><button onClick={() => setSort(key as SortKey)} className="font-semibold">{label}{sortKey === key ? (sortDir === 1 ? " ↑" : " ↓") : ""}</button></th>)}</tr></thead><tbody className="divide-y divide-border">{shown.map((row, index) => { const status = gpaStatus(row.primaryGpa, row.hours); return <tr key={row.person.id} onClick={() => setSelected(row)} className={`cursor-pointer ${index % 2 ? "bg-app-background/25" : "bg-surface"} hover:bg-[var(--module-tint)]`}><td className="px-3 py-3 font-semibold">{getDisplayName(row.person)}</td><td className="px-3 py-3">{row.classLevel}</td><td className="px-3 py-3 tabular-nums">{row.hours.toFixed(1)}</td><td className={`px-3 py-3 font-semibold tabular-nums ${gpaTone(row.primaryGpa)}`}>{gpaText(row.primaryGpa)}{view.kind === "year" ? <span className="block text-[10px] font-normal text-text-secondary">{row.semesterBreakdown}</span> : null}</td><td className="px-3 py-3 tabular-nums">{gpaText(row.midtermGpa)}</td><td className="px-3 py-3 tabular-nums">{gpaText(row.yearGpa)}</td><td className="px-3 py-3 font-semibold tabular-nums text-text-primary">{gpaText(row.cumulativeGpa)}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${badgeClass(status)}`}>{status}</span><span className="mt-1 block text-[10px] text-text-secondary">{row.active ? "● Active" : "○ Non-Active"}</span></td></tr>; })}</tbody></table></div></section>
    <section><h2 className="mb-2 text-sm font-semibold">Player Cards</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{shown.map((row) => <button key={row.person.id} onClick={() => setSelected(row)} className="rounded-card border border-border bg-surface p-4 text-left hover:border-[var(--module-accent)]"><div className="flex justify-between gap-2"><div><h3 className="font-semibold">{getDisplayName(row.person)}</h3><p className="text-xs text-text-secondary">{row.classLevel} · {row.active ? "Active" : "Non-Active"}</p></div><p className={`text-2xl font-semibold ${gpaTone(row.primaryGpa)}`}>{gpaText(row.primaryGpa)}</p></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span>Hrs <b className="block">{row.hours}</b></span><span>Yr GPA <b className="block">{gpaText(row.yearGpa)}</b></span><span>Cum GPA <b className="block">{gpaText(row.cumulativeGpa)}</b></span></div><div className="mt-3 border-t border-border pt-2 text-[11px] text-text-secondary">{row.history.map((item) => <div key={item.term.id} className="flex justify-between"><span>{item.term.label}</span><span>{item.record.creditHours} hrs · {item.record.semesterGpa.toFixed(2)}</span></div>)}</div></button>)}</div></section>
    {selected ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-card border border-border bg-surface shadow-2xl"><div className="flex justify-between border-b border-border p-4"><div><h2 className="text-lg font-semibold">{getDisplayName(selected.person)}</h2><p className="text-xs text-text-secondary">Complete academic history</p></div><button onClick={() => setSelected(null)} className="text-xl text-text-secondary">×</button></div><table className="w-full min-w-[650px] text-sm"><thead className="bg-app-background/60 text-xs text-text-secondary"><tr><th className="px-3 py-2 text-left">Semester</th><th>Yr</th><th>Hrs</th><th>Sem GPA</th><th>Midterm</th><th>Cum GPA</th></tr></thead><tbody className="divide-y divide-border">{selected.history.map((item) => <tr key={item.term.id} className={item.term.id === orderedTerms[0]?.id ? "bg-[var(--module-tint)]" : ""}><td className="px-3 py-2 font-medium">{item.term.label}</td><td className="text-center">{selected.classLevel}</td><td className="text-center">{item.record.creditHours}</td><td className="text-center">{item.record.semesterGpa.toFixed(2)}</td><td className="text-center">{gpaText(item.record.midtermGpa)}</td><td className="text-center font-semibold">{gpaText(item.runningGpa)}</td></tr>)}</tbody></table></div></div> : null}
    {entryOpen ? <GradeEntryDialog people={people.filter((person) => person.status.key === "current")} onClose={() => setEntryOpen(false)} /> : null}
  </ModulePageShell>;
}
