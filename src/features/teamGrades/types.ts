export type AcademicSeason = "fall" | "spring";

export type AcademicTerm = {
  id: string;
  termKey: string;
  label: string;
  season: AcademicSeason;
  calendarYear: number;
  academicYear: string;
  sortOrder: number;
};

export type AcademicRecord = {
  id: string;
  termId: string;
  personId: string;
  creditHours: number;
  semesterGpa: number;
  midtermGpa: number | null;
};

export type PlayerAcademicSummary = {
  cumulativeGpa: number | null;
  latestSemesterGpa: number | null;
  latestSemesterLabel: string | null;
  academicYearGpa: number | null;
  academicYearLabel: string | null;
  totalCreditHours: number;
  history: Array<{
    termLabel: string;
    creditHours: number;
    semesterGpa: number;
    midtermGpa: number | null;
    cumulativeGpa: number | null;
  }>;
};

export type PlayerAcademicSummaryMap = Record<string, PlayerAcademicSummary>;

export type GradeView = { kind: "all" } | { kind: "term"; id: string } | { kind: "year"; academicYear: string };
export type RosterView = "all" | "active" | "inactive";
export type ClassLevel = "SR" | "JR" | "SO" | "FR";
