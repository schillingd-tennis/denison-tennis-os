import type { DayBudgetRow, DayRuleSummary } from "./types";

export type DayRuleCalendarCell = {
  date: string | null;
  dayNumber: number | null;
};

export type DayRuleCalendarCount = {
  seasonCount: number;
  monthCount: number;
  monthBudget: number;
};

export function practiceSeasonStartYear(today: string): number {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return month >= 8 ? year : year - 1;
}

export function practiceCalendarYear(month: number, today: string): number {
  const startYear = practiceSeasonStartYear(today);
  return month <= 4 ? startYear + 1 : startYear;
}

export function buildDayRuleCalendarCells(
  row: DayBudgetRow,
  today: string,
): DayRuleCalendarCell[] {
  const year = practiceCalendarYear(row.month, today);
  const firstWeekday = new Date(Date.UTC(year, row.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, row.month, 0)).getUTCDate();
  const cells: DayRuleCalendarCell[] = Array.from(
    { length: firstWeekday },
    () => ({ date: null, dayNumber: null }),
  );

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    cells.push({
      date: `${year}-${String(row.month).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`,
      dayNumber,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, dayNumber: null });
  return cells;
}

export function buildDayRuleCalendarCounts(
  summary: DayRuleSummary,
  today: string,
): Map<string, DayRuleCalendarCount> {
  const startYear = practiceSeasonStartYear(today);
  const seasonStart = `${startYear}-08-01`;
  const seasonEnd = `${startYear + 1}-04-30`;
  const seasonDates = [...new Set(
    summary.rows.flatMap((row) => row.days.map((day) => day.date)),
  )]
    .filter((date) => date >= seasonStart && date <= seasonEnd)
    .sort();
  const seasonCountByDate = new Map(
    seasonDates.map((date, index) => [date, index + 1]),
  );
  const counts = new Map<string, DayRuleCalendarCount>();

  for (const row of summary.rows) {
    const year = practiceCalendarYear(row.month, today);
    const prefix = `${year}-${String(row.month).padStart(2, "0")}-`;
    const monthDates = [...new Set(
      row.days.map((day) => day.date).filter((date) => date.startsWith(prefix)),
    )].sort();
    monthDates.forEach((date, index) => {
      const seasonCount = seasonCountByDate.get(date);
      if (!seasonCount) return;
      counts.set(date, {
        seasonCount,
        monthCount: index + 1,
        monthBudget: row.budget,
      });
    });
  }

  return counts;
}
