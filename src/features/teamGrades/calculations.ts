import type { Person } from "@/features/people/types";
import { getDisplayName } from "@/features/people/utils";

import type { AcademicRecord, AcademicTerm, ClassLevel, GradeView, PlayerAcademicSummaryMap, RosterView } from "./types";

export type GradePlayerRow = {
  person: Person;
  active: boolean;
  classLevel: ClassLevel;
  hours: number;
  primaryGpa: number | null;
  semesterGpa: number | null;
  midtermGpa: number | null;
  yearGpa: number | null;
  cumulativeGpa: number | null;
  semesterBreakdown: string;
  history: Array<{ term: AcademicTerm; record: AcademicRecord; runningGpa: number | null }>;
};

export function weightedGpa(records: readonly AcademicRecord[]): number | null {
  const eligible = records.filter((record) => record.creditHours > 0);
  const hours = eligible.reduce((sum, record) => sum + record.creditHours, 0);
  if (!hours) return null;
  return eligible.reduce((sum, record) => sum + record.semesterGpa * record.creditHours, 0) / hours;
}

export function classLevelFor(person: Person, term: AcademicTerm | null, asOf = new Date()): ClassLevel {
  if (!person.classYear) return "FR";
  const academicEndYear = term
    ? Number(term.academicYear.split("-")[0]) + 1
    : asOf.getFullYear() + (asOf.getMonth() >= 6 ? 1 : 0);
  const difference = person.classYear - academicEndYear;
  if (difference <= 0) return "SR";
  if (difference === 1) return "JR";
  if (difference === 2) return "SO";
  return "FR";
}

export function gpaStatus(gpa: number | null, hours: number): string {
  if (gpa == null) return "No GPA";
  if (gpa >= 3.7 && hours >= 12) return "Dean's List";
  if (gpa >= 3.5) return "Honor Roll";
  if (gpa >= 3) return "Good";
  return "Below 3.0";
}

export function buildGradeRows({
  people,
  terms,
  records,
  view,
  rosterView,
}: {
  people: Person[];
  terms: AcademicTerm[];
  records: AcademicRecord[];
  view: GradeView;
  rosterView: RosterView;
}): GradePlayerRow[] {
  const orderedTerms = [...terms].sort((a, b) => a.sortOrder - b.sortOrder);
  const latestTerm = orderedTerms.at(-1) ?? null;
  const activeIds = new Set(records.filter((record) => record.termId === latestTerm?.id).map((record) => record.personId));
  const termsById = new Map(terms.map((term) => [term.id, term]));
  const selectedTerm = view.kind === "term"
    ? termsById.get(view.id) ?? null
    : view.kind === "year"
      ? orderedTerms.filter((term) => term.academicYear === view.academicYear).at(-1) ?? null
      : null;

  return people
    .map((person): GradePlayerRow | null => {
      const historyRecords = records
        .filter((record) => record.personId === person.id && termsById.has(record.termId))
        .sort((a, b) => (termsById.get(a.termId)!.sortOrder - termsById.get(b.termId)!.sortOrder));
      if (!historyRecords.length) return null;
      const active = activeIds.has(person.id);
      if (rosterView === "active" && !active) return null;
      if (rosterView === "inactive" && active) return null;

      const viewRecords = view.kind === "term"
        ? historyRecords.filter((record) => record.termId === view.id)
        : view.kind === "year"
          ? historyRecords.filter((record) => termsById.get(record.termId)?.academicYear === view.academicYear)
          : historyRecords;
      if (!viewRecords.length) return null;
      const year = view.kind === "year"
        ? view.academicYear
        : (selectedTerm?.academicYear ?? latestTerm?.academicYear ?? "");
      const yearRecords = historyRecords.filter((record) => termsById.get(record.termId)?.academicYear === year);
      let running: AcademicRecord[] = [];
      const history = historyRecords.map((record) => {
        running = [...running, record];
        return { term: termsById.get(record.termId)!, record, runningGpa: weightedGpa(running) };
      });
      const primaryGpa = view.kind === "term"
        ? viewRecords[0]?.semesterGpa ?? null
        : weightedGpa(viewRecords);
      return {
        person,
        active,
        classLevel: classLevelFor(person, selectedTerm),
        hours: viewRecords.reduce((sum, record) => sum + record.creditHours, 0),
        primaryGpa,
        semesterGpa: view.kind === "term" ? primaryGpa : null,
        midtermGpa: view.kind === "term" ? viewRecords[0]?.midtermGpa ?? null : null,
        yearGpa: weightedGpa(yearRecords),
        cumulativeGpa: weightedGpa(historyRecords),
        semesterBreakdown: viewRecords.map((record) => `${termsById.get(record.termId)?.season === "fall" ? "F" : "S"}:${record.semesterGpa.toFixed(2)}`).join(" "),
        history,
      };
    })
    .filter((row): row is GradePlayerRow => row != null)
    .sort((a, b) => a.person.lastName.localeCompare(b.person.lastName) || getDisplayName(a.person).localeCompare(getDisplayName(b.person)));
}

export function teamWeightedGpa(rows: readonly GradePlayerRow[]): number | null {
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  if (!totalHours) return null;
  return rows.reduce((sum, row) => sum + (row.primaryGpa ?? 0) * row.hours, 0) / totalHours;
}

export function buildPlayerAcademicSummaries(
  terms: readonly AcademicTerm[],
  records: readonly AcademicRecord[],
): PlayerAcademicSummaryMap {
  const termsById = new Map(terms.map((term) => [term.id, term]));
  const personIds = [...new Set(records.map((record) => record.personId))];

  return Object.fromEntries(personIds.map((personId) => {
    const personRecords = records
      .filter((record) => record.personId === personId && termsById.has(record.termId))
      .sort((a, b) => termsById.get(a.termId)!.sortOrder - termsById.get(b.termId)!.sortOrder);
    const latestRecord = personRecords.at(-1) ?? null;
    const latestTerm = latestRecord ? termsById.get(latestRecord.termId) ?? null : null;
    const yearRecords = latestTerm
      ? personRecords.filter((record) => termsById.get(record.termId)?.academicYear === latestTerm.academicYear)
      : [];
    let running: AcademicRecord[] = [];
    const history = personRecords.map((record) => {
      running = [...running, record];
      return {
        termLabel: termsById.get(record.termId)!.label,
        creditHours: record.creditHours,
        semesterGpa: record.semesterGpa,
        midtermGpa: record.midtermGpa,
        cumulativeGpa: weightedGpa(running),
      };
    });

    return [personId, {
      cumulativeGpa: weightedGpa(personRecords),
      latestSemesterGpa: latestRecord?.semesterGpa ?? null,
      latestSemesterLabel: latestTerm?.label ?? null,
      academicYearGpa: weightedGpa(yearRecords),
      academicYearLabel: latestTerm?.academicYear ?? null,
      totalCreditHours: personRecords.reduce((sum, record) => sum + record.creditHours, 0),
      history,
    }];
  }));
}
