import assert from "node:assert/strict";
import test from "node:test";

import type { Person } from "@/features/people/types";
import { parseGradeSpreadsheet } from "./spreadsheetImport";

const person = { id: "p1", firstName: "Jonathan", preferredName: "Mason", lastName: "Conlin", denisonId: "D123" } as Person;

test("grade spreadsheet matches by Denison ID and reads only the stored measures", () => {
  const preview = parseGradeSpreadsheet([
    ["Academic Period Desc", "Student ID", "Last Name", "First Name", "Preferred First Name", "Current Attempted Hours", "GPA (period) - truncated", "Mid-term GPA", "GPA (cumulative) - truncated"],
    ["Spring Semester 2026", "D123", "Conlin", "Jonathan", "Mason", 14, 3, 3.33, 3.02],
  ], [person]);
  assert.equal(preview.termLabel, "Spring 2026");
  assert.deepEqual(preview.rows[0], { sourceRow: 2, studentId: "D123", sourceName: "Mason Conlin", personId: "p1", matchedName: "Mason Conlin", creditHours: 14, semesterGpa: 3, midtermGpa: 3.33, issue: null });
});

test("grade spreadsheet refuses mixed semesters", () => {
  const header = ["Academic Period Desc", "Student ID", "Last Name", "First Name", "Preferred First Name", "Current Attempted Hours", "GPA (period) - truncated", "Mid-term GPA"];
  assert.throws(() => parseGradeSpreadsheet([header, ["Fall Semester 2025", "D123", "Conlin", "Jonathan", "Mason", 14, 3, 3], ["Spring Semester 2026", "D123", "Conlin", "Jonathan", "Mason", 14, 3, 3]], [person]), /exactly one/);
});
