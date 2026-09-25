"use client";

import { CalendarCheck2, ChevronLeft, ChevronRight, Swords, Trophy } from "lucide-react";
import { useState } from "react";

import {
  buildDayRuleCalendarCells,
  buildDayRuleCalendarCounts,
  practiceCalendarYear,
} from "../dayRuleCalendar";
import type { DayRuleDay, DayRuleSummary } from "../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function easternToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function sourceKinds(day?: DayRuleDay) {
  return {
    practice: Boolean(day?.sources.some((source) => source.type === "practice")),
    competition: Boolean(day?.sources.some((source) => source.type === "competition")),
  };
}

export default function DayRuleCalendar({ summary }: { summary: DayRuleSummary }) {
  const today = easternToday();
  const currentMonth = Number(today.slice(5, 7));
  const initialIndex = Math.max(
    0,
    summary.rows.findIndex((row) => row.month === currentMonth),
  );
  const [monthIndex, setMonthIndex] = useState(initialIndex);
  const row = summary.rows[monthIndex] ?? summary.rows[0];
  const year = row ? practiceCalendarYear(row.month, today) : Number(today.slice(0, 4));
  const monthPrefix = `${year}-${String(row?.month ?? 1).padStart(2, "0")}-`;
  const monthDays = row?.days.filter((day) => day.date.startsWith(monthPrefix)) ?? [];
  const dayByDate = new Map(monthDays.map((day) => [day.date, day]));
  const cells = row ? buildDayRuleCalendarCells(row, today) : [];
  const countByDate = buildDayRuleCalendarCounts(summary, today);
  const firstCountedDate = monthDays[0]?.date ?? null;
  const [selectedDate, setSelectedDate] = useState<string | null>(
    dayByDate.has(today) ? today : firstCountedDate,
  );
  const selectedDay = selectedDate ? dayByDate.get(selectedDate) : undefined;
  const practiceDays = monthDays.filter((day) => sourceKinds(day).practice).length;
  const competitionDays = monthDays.filter((day) => sourceKinds(day).competition).length;
  const monthVariance = (row?.budget ?? 0) - monthDays.length;

  function selectMonth(nextIndex: number) {
    const nextRow = summary.rows[nextIndex];
    if (!nextRow) return;
    const nextYear = practiceCalendarYear(nextRow.month, today);
    const prefix = `${nextYear}-${String(nextRow.month).padStart(2, "0")}-`;
    setMonthIndex(nextIndex);
    setSelectedDate(nextRow.days.find((day) => day.date.startsWith(prefix))?.date ?? null);
  }

  if (!row) return null;

  return (
    <div className="grid gap-3">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-semibold tracking-wide text-text-secondary uppercase">{row.label} budget</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{row.budget} days</p>
          <p className="mt-1 text-xs text-text-secondary">Monthly allocation</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-semibold tracking-wide text-text-secondary uppercase">Counted this month</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{monthDays.length} days</p>
          <p className="mt-1 text-xs text-text-secondary">{practiceDays} practice · {competitionDays} DOC</p>
        </div>
        <div className={`rounded-card border p-4 shadow-sm ${monthVariance < 0 ? "border-red-200 bg-red-50 text-danger" : "border-emerald-200 bg-emerald-50 text-success"}`}>
          <p className="text-[10px] font-semibold tracking-wide uppercase">Month +/−</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{signed(monthVariance)}</p>
          <p className="mt-1 text-xs">Upcoming DOCs included</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous month" disabled={monthIndex === 0} onClick={() => selectMonth(monthIndex - 1)} className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface disabled:opacity-35"><ChevronLeft className="h-4 w-4"/></button>
            <h2 className="min-w-36 text-center text-base font-semibold">{row.label} {year}</h2>
            <button type="button" aria-label="Next month" disabled={monthIndex === summary.rows.length - 1} onClick={() => selectMonth(monthIndex + 1)} className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface disabled:opacity-35"><ChevronRight className="h-4 w-4"/></button>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-text-secondary">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-600"/>Practice</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"/>Date of competition</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600"/>Today</span>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border bg-app-background">
          {WEEKDAYS.map((weekday) => <div key={weekday} className="px-1 py-2 text-center text-[9px] font-bold tracking-wide text-text-secondary uppercase sm:px-3 sm:text-left">{weekday}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, index) => {
            if (!cell.date || !cell.dayNumber) return <div key={`empty-${index}`} className="min-h-16 border-r border-b border-border bg-app-background/50 sm:min-h-24"/>;
            const day = dayByDate.get(cell.date);
            const count = countByDate.get(cell.date);
            const kinds = sourceKinds(day);
            const selected = selectedDate === cell.date;
            const background = kinds.practice && kinds.competition
              ? "bg-[linear-gradient(135deg,rgba(124,58,237,0.10)_0_50%,rgba(245,158,11,0.14)_50%_100%)]"
              : kinds.practice
                ? "bg-violet-50"
                : kinds.competition
                  ? "bg-amber-50"
                  : "bg-surface";
            return (
              <button key={cell.date} type="button" onClick={() => setSelectedDate(cell.date)} aria-label={`${dateLabel(cell.date)}${count ? `, day ${count.seasonCount} of 114 and ${count.monthCount} of ${count.monthBudget} for ${row.label}` : ", not counted"}`} className={`min-h-16 border-r border-b border-border p-1.5 text-left transition-shadow sm:min-h-24 sm:p-2 ${background} ${selected ? "ring-2 ring-inset ring-blue-600" : "hover:ring-1 hover:ring-inset hover:ring-border"}`}>
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${cell.date === today ? "bg-blue-600 text-white" : "text-text-primary"}`}>{cell.dayNumber}</span>
                <span className="mt-1 block space-y-1">
                  {day?.sources.map((source, sourceIndex) => <span key={`${source.type}-${source.label}-${sourceIndex}`} className={`flex min-w-0 items-center gap-1 text-[9px] font-semibold ${source.type === "practice" ? "text-violet-700" : "text-amber-800"}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${source.type === "practice" ? "bg-violet-600" : "bg-amber-500"}`}/><span className="hidden truncate sm:block">{source.label}</span></span>)}
                  {count ? <span className="block text-[9px] font-semibold tabular-nums text-text-secondary">Year {count.seasonCount}/{summary.limit} · Month {count.monthCount}/{count.monthBudget}</span> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 bg-app-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold">{selectedDate ? dateLabel(selectedDate) : `No counted dates in ${row.label}`}</p>
            {selectedDay ? <div className="mt-1 flex flex-wrap items-center gap-2">{selectedDay.sources.map((source, index) => <span key={`${source.type}-${source.label}-${index}`} className={`inline-flex items-center gap-1 text-[11px] ${source.type === "practice" ? "text-violet-700" : "text-amber-800"}`}>{source.type === "practice" ? <Swords className="h-3 w-3"/> : <Trophy className="h-3 w-3"/>}{source.label}</span>)}{selectedDate && countByDate.get(selectedDate) ? <span className="text-[11px] font-semibold tabular-nums text-text-secondary">Year {countByDate.get(selectedDate)?.seasonCount}/{summary.limit} · Month {countByDate.get(selectedDate)?.monthCount}/{countByDate.get(selectedDate)?.monthBudget}</span> : null}</div> : <p className="mt-1 text-[11px] text-text-secondary">{selectedDate ? "No countable practice or competition scheduled." : "Select a highlighted date to see what is counted."}</p>}
          </div>
          {selectedDay ? <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800"><CalendarCheck2 className="h-3.5 w-3.5"/>Counts as 1 day</span> : null}
        </div>
      </section>
    </div>
  );
}
