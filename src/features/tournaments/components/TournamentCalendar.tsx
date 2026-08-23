"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { EMPTY_VALUE, formatDate } from "@/lib/formatting";
import { recruitingTournamentPath } from "@/lib/module-routes";

import {
  addMonths,
  monthGridDays,
  partitionTournamentsForCalendar,
  startOfMonth,
  toDayKey,
  tournamentCoversDay,
} from "../calendar";
import type { Tournament } from "../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthTitle(month: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month);
}

export default function TournamentCalendar({ tournaments }: { tournaments: Tournament[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = useMemo(() => monthGridDays(month), [month]);
  const { dated, undated } = useMemo(() => partitionTournamentsForCalendar(tournaments), [tournaments]);
  const todayKey = toDayKey(new Date());
  const monthIndex = month.getMonth();

  return (
    <div className="overflow-hidden rounded-card border border-[var(--module-border)] bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">{monthTitle(month)}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth((current) => addMonths(current, -1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-control text-text-secondary hover:bg-app-background hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="h-8 rounded-control px-2.5 text-xs font-medium text-text-secondary hover:bg-app-background hover:text-text-primary"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-control text-text-secondary hover:bg-app-background hover:text-text-primary"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-app-background/70">
        {WEEKDAYS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = toDayKey(day);
          const inMonth = day.getMonth() === monthIndex;
          const events = dated.filter((entry) => tournamentCoversDay(entry.range, day));
          return (
            <div
              key={key}
              className={`min-h-[7.5rem] border-b border-r border-border p-1.5 last:border-r-0 ${
                inMonth ? "bg-surface" : "bg-app-background/50"
              }`}
            >
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  key === todayKey
                    ? "bg-[var(--module-accent)] text-surface"
                    : inMonth
                      ? "text-text-primary"
                      : "text-text-secondary"
                }`}
              >
                {day.getDate()}
              </div>
              <ul className="space-y-1">
                {events.map(({ tournament }) => (
                  <li key={`${tournament.id}-${key}`}>
                    <Link
                      href={recruitingTournamentPath(tournament.id)}
                      className="block truncate rounded-control bg-[var(--module-tint)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--module-accent)] hover:underline"
                      title={tournament.name}
                    >
                      {tournament.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {undated.length > 0 ? (
        <div className="border-t border-border px-4 py-3">
          <h3 className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Undated tournaments</h3>
          <p className="mt-1 text-xs text-text-secondary">These records have no valid start or end date and cannot be placed on the calendar.</p>
          <ul className="mt-2 space-y-1">
            {undated.map((tournament) => (
              <li key={tournament.id}>
                <Link
                  href={recruitingTournamentPath(tournament.id)}
                  className="text-sm font-medium text-text-primary hover:text-[var(--module-accent)] hover:underline"
                >
                  {tournament.name}
                </Link>
                <span className="ml-2 text-xs text-text-secondary">{formatDate(tournament.startDate) === EMPTY_VALUE ? "No dates" : formatDate(tournament.startDate)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
