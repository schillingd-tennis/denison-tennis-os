export type PracticeTab = "daily-plan" | "drills" | "dates-of-competition" | "114-day-tracker" | "practice-log";

export const PRACTICE_TABS: { id: PracticeTab; label: string }[] = [
  { id: "daily-plan", label: "Daily Plan" },
  { id: "drills", label: "Drill Library" },
  { id: "dates-of-competition", label: "Dates of Competition" },
  { id: "114-day-tracker", label: "114-Day Tracker" },
  { id: "practice-log", label: "Practice Log" },
];

export type PracticeDrill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  sourceTags: string;
  category: string;
  notes: string;
  frequency: string;
};

export type PracticeDay = { id: string; date: string; notes: string };
export type DayRuleDay = { date: string; sources: { type: "practice" | "competition"; label: string }[] };
export type DayBudgetRow = { month: number; label: string; budget: number; budgetToDate: number; used: number; usedToDate: number; variance: number; varianceToDate: number; days: DayRuleDay[] };
export type DayRuleSummary = { limit: number; budgetTotal: number; budgetToDate: number; used: number; usedToDate: number; remaining: number; varianceToDate: number; rows: DayBudgetRow[] };

export type DailyPracticePlan = {
  id: string;
  planDate: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  announcements: string;
  focus: string;
  countable: boolean;
  status: "draft" | "published" | "completed";
  drills: PracticeDrill[];
};

export type PracticeCompetitionDate = {
  id: string;
  dateNumber: number | null;
  dateGroup: string | null;
  date: string;
  label: string;
  location: string;
  status: string;
};
