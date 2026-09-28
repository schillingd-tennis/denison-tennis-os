import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { Person } from "@/features/people/types";

import { buildGradeRows, buildPlayerAcademicSummaries, gpaStatus, weightedGpa } from "./calculations";
import type { AcademicRecord, AcademicTerm } from "./types";

const terms: AcademicTerm[] = [
  { id: "fall", termKey: "f2024", label: "Fall 2024", season: "fall", calendarYear: 2024, academicYear: "2024-25", sortOrder: 4049 },
  { id: "spring", termKey: "s2025", label: "Spring 2025", season: "spring", calendarYear: 2025, academicYear: "2024-25", sortOrder: 4050 },
];
const records: AcademicRecord[] = [
  { id: "1", termId: "fall", personId: "p1", creditHours: 12, semesterGpa: 4, midtermGpa: 3.9 },
  { id: "2", termId: "spring", personId: "p1", creditHours: 18, semesterGpa: 3, midtermGpa: 3.1 },
];
const person = { id: "p1", firstName: "Test", lastName: "Player", classYear: 2026, role: { id: "r", key: "player", label: "Player" }, status: { id: "s", key: "current", label: "Current" }, roleId: "r", statusId: "s", relationships: [], createdAt: "", updatedAt: "" } as Person;

test("weighted GPA uses attempted hours rather than averaging semesters", () => {
  assert.equal(weightedGpa(records), 3.4);
});

test("academic-year and cumulative views derive from raw semester rows", () => {
  const rows = buildGradeRows({ people: [person], terms, records, view: { kind: "year", academicYear: "2024-25" }, rosterView: "all" });
  assert.equal(rows[0]?.primaryGpa, 3.4);
  assert.equal(rows[0]?.cumulativeGpa, 3.4);
  assert.equal(rows[0]?.hours, 30);
  assert.equal(rows[0]?.active, true);
});

test("player academic summaries keep roster and workspace GPA values synchronized", () => {
  const summary = buildPlayerAcademicSummaries(terms, records).p1;
  assert.equal(summary.cumulativeGpa, 3.4);
  assert.equal(summary.latestSemesterGpa, 3);
  assert.equal(summary.latestSemesterLabel, "Spring 2025");
  assert.equal(summary.academicYearGpa, 3.4);
  assert.equal(summary.totalCreditHours, 30);
  assert.equal(summary.history.length, 2);
});

test("Dean's List requires 3.70 and at least 12 hours", () => {
  assert.equal(gpaStatus(3.7, 12), "Dean's List");
  assert.equal(gpaStatus(3.9, 11), "Honor Roll");
  assert.equal(gpaStatus(2.99, 16), "Below 3.0");
});

test("migration stores only the three registrar measures per player/term", () => {
  const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0071_team_academic_grades.sql"), "utf8");
  assert.match(sql, /credit_hours/);
  assert.match(sql, /semester_gpa/);
  assert.match(sql, /midterm_gpa/);
  assert.doesNotMatch(sql, /cumulative_gpa|academic_year_gpa/);
});
