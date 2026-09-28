import type { Person } from "@/features/people/types";

import { normalizeAcademicName } from "./import";
import type { AcademicSeason } from "./types";

type CellValue = unknown;

export type SpreadsheetGradePreview = {
  season: AcademicSeason;
  calendarYear: number;
  termLabel: string;
  rows: Array<{
    sourceRow: number;
    studentId: string;
    sourceName: string;
    personId: string | null;
    matchedName: string | null;
    creditHours: number;
    semesterGpa: number;
    midtermGpa: number | null;
    issue: string | null;
  }>;
};

const requiredHeaders = {
  studentId: "Student ID",
  lastName: "Last Name",
  firstName: "First Name",
  preferredName: "Preferred First Name",
  hours: "Current Attempted Hours",
  semesterGpa: "GPA (period) - truncated",
  midtermGpa: "Mid-term GPA",
  period: "Academic Period Desc",
} as const;

function text(value: CellValue | undefined): string {
  return value == null ? "" : String(value).trim();
}

function number(value: CellValue | undefined): number | null {
  if (value == null || text(value) === "") return null;
  const parsed = typeof value === "number" ? value : Number(text(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGradeSpreadsheet(rows: CellValue[][], people: Person[]): SpreadsheetGradePreview {
  if (rows.length < 2) throw new Error("The spreadsheet does not contain any player rows.");
  const headers = rows[0].map(text);
  const column = Object.fromEntries(Object.entries(requiredHeaders).map(([key, label]) => [key, headers.indexOf(label)])) as Record<keyof typeof requiredHeaders, number>;
  const missing = Object.entries(column).filter(([, index]) => index < 0).map(([key]) => requiredHeaders[key as keyof typeof requiredHeaders]);
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}.`);

  const periodLabels = [...new Set(rows.slice(1).map((row) => text(row[column.period])).filter(Boolean))];
  if (periodLabels.length !== 1) throw new Error("The spreadsheet must contain exactly one academic semester.");
  const termMatch = periodLabels[0].match(/^(Fall|Spring) Semester (20\d{2})$/i);
  if (!termMatch) throw new Error(`Could not recognize the academic semester: ${periodLabels[0]}.`);
  const season = termMatch[1].toLowerCase() as AcademicSeason;
  const calendarYear = Number(termMatch[2]);

  const byStudentId = new Map(people.filter((person) => person.denisonId).map((person) => [person.denisonId!.toUpperCase(), person]));
  const byName = new Map<string, Person[]>();
  for (const person of people) {
    for (const value of [`${person.firstName} ${person.lastName}`, `${person.preferredName ?? ""} ${person.lastName}`]) {
      const key = normalizeAcademicName(value);
      if (key) byName.set(key, [...(byName.get(key) ?? []), person]);
    }
  }

  const previewRows = rows.slice(1).filter((row) => row.some((value) => text(value))).map((row, index) => {
    const studentId = text(row[column.studentId]).toUpperCase();
    const preferred = text(row[column.preferredName]);
    const first = preferred || text(row[column.firstName]);
    const last = text(row[column.lastName]);
    const sourceName = `${first} ${last}`.trim();
    const hours = number(row[column.hours]);
    const semesterGpa = number(row[column.semesterGpa]);
    const midtermGpa = number(row[column.midtermGpa]);
    const idMatch = byStudentId.get(studentId);
    const nameMatches = byName.get(normalizeAcademicName(sourceName)) ?? [];
    const person = idMatch ?? (nameMatches.length === 1 ? nameMatches[0] : null);
    let issue: string | null = null;
    if (!person) issue = nameMatches.length > 1 ? "Name matches more than one roster player" : "No roster match";
    else if (hours == null || hours < 0 || hours > 40) issue = "Invalid attempted hours";
    else if (semesterGpa == null || semesterGpa < 0 || semesterGpa > 4) issue = "Invalid semester GPA";
    else if (midtermGpa != null && (midtermGpa < 0 || midtermGpa > 4)) issue = "Invalid midterm GPA";
    return {
      sourceRow: index + 2, studentId, sourceName, personId: person?.id ?? null,
      matchedName: person ? `${person.preferredName || person.firstName} ${person.lastName}` : null,
      creditHours: hours ?? Number.NaN, semesterGpa: semesterGpa ?? Number.NaN, midtermGpa, issue,
    };
  });
  if (!previewRows.length) throw new Error("The spreadsheet does not contain any grade rows.");
  return { season, calendarYear, termLabel: `${termMatch[1][0].toUpperCase()}${termMatch[1].slice(1).toLowerCase()} ${calendarYear}`, rows: previewRows };
}
