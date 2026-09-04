import type { DayRuleSummary } from "./types";

export const DAY_RULE_LIMIT = 114;
export const MONTHLY_DAY_BUDGETS = [
  [8, "August", 2], [9, "September", 18], [10, "October", 15], [11, "November", 6], [12, "December", 3],
  [1, "January", 9], [2, "February", 21], [3, "March", 21], [4, "April", 19],
] as const;

export function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor <= last) { dates.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
  return dates;
}

export function calculateDayRule(practices: (string | { date: string; label?: string })[], competitions: { start: string; end: string; label?: string }[], today = new Date().toISOString().slice(0, 10)): DayRuleSummary {
  const dayMap = new Map<string, { type: "practice" | "competition"; label: string }[]>();
  const add = (date: string, type: "practice" | "competition", label: string) => dayMap.set(date, [...(dayMap.get(date) ?? []), { type, label }]);
  practices.forEach((practice) => add(typeof practice === "string" ? practice : practice.date, "practice", typeof practice === "string" ? "Team practice" : practice.label || "Team practice"));
  competitions.forEach((event) => enumerateDates(event.start, event.end).forEach((date) => add(date, "competition", event.label || "Competition")));
  const usedDates = [...dayMap.keys()];
  const currentMonth = Number(today.slice(5, 7));
  const currentBudgetIndex = MONTHLY_DAY_BUDGETS.findIndex(([month]) => month === currentMonth);
  const rows = MONTHLY_DAY_BUDGETS.map(([month, label, budget], budgetIndex) => {
    const days = usedDates.filter((date) => Number(date.slice(5, 7)) === month).sort().map((date) => ({ date, sources: dayMap.get(date) ?? [] }));
    const used = days.length;
    const daysInMonth = new Date(Number(today.slice(0, 4)), month, 0).getDate();
    const budgetToDate = budgetIndex === currentBudgetIndex ? Math.round(budget * Number(today.slice(8, 10)) / daysInMonth) : budgetIndex < currentBudgetIndex ? budget : 0;
    const usedToDate = days.filter((day) => day.date <= today).length;
    return { month, label, budget, budgetToDate, used, usedToDate, variance: budget - used, varianceToDate: budgetToDate - usedToDate, days };
  });
  const used = usedDates.length; const budgetTotal = rows.reduce((sum, row) => sum + row.budget, 0); const budgetToDate = rows.reduce((sum, row) => sum + row.budgetToDate, 0); const usedToDate = usedDates.filter((date) => date <= today).length;
  return { limit: DAY_RULE_LIMIT, budgetTotal, budgetToDate, used, usedToDate, remaining: DAY_RULE_LIMIT - used, varianceToDate: budgetToDate - usedToDate, rows };
}
