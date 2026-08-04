import { writeFileSync } from "node:fs";

import type { Person } from "../../src/features/people/types";
import type { ImportReport, SkippedRow } from "./types";

const MISSING_VALUE_FIELDS: (keyof Person)[] = [
  "middleName",
  "preferredName",
  "dateOfBirth",
  "cellPhone",
  "personalEmail",
  "denisonEmail",
  "city",
  "state",
  "country",
  "classYear",
  "major",
  "minor",
  "denisonId",
  "dorm",
  "roomNumber",
  "utr",
  "wtn",
  "dominantHand",
  "heightInches",
  "weightLbs",
];

export function buildMissingValueCounts(people: Person[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const field of MISSING_VALUE_FIELDS) {
    counts[field] = people.filter((person) => person[field] === undefined).length;
  }
  return counts;
}

export function writeReport(report: ImportReport, filePath: string): void {
  writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
}

export function printReportSummary(report: ImportReport): void {
  const lines: string[] = [];
  lines.push("");
  lines.push("Denison Tennis OS — Player Import");
  lines.push("==================================");
  lines.push(`Source:            ${report.source}`);
  lines.push(`Timestamp:         ${report.timestamp}`);
  lines.push(`Rows in file:      ${report.totalRowsInFile}`);
  lines.push(`Players imported:  ${report.totalPlayersImported}`);
  lines.push(`Rows skipped:      ${report.totalSkipped}`);

  if (report.skipped.length > 0) {
    lines.push("");
    lines.push("Skipped rows:");
    for (const row of report.skipped) {
      lines.push(`  - ${row.name}: ${row.reason}`);
    }
  }

  if (report.duplicates.denisonIds.length > 0) {
    lines.push("");
    lines.push("Duplicate Denison IDs:");
    for (const dup of report.duplicates.denisonIds) {
      lines.push(`  - "${dup.value}" used by: ${dup.names.join(", ")}`);
    }
  }

  if (report.duplicates.emails.length > 0) {
    lines.push("");
    lines.push("Duplicate emails:");
    for (const dup of report.duplicates.emails) {
      lines.push(`  - "${dup.value}" used by: ${dup.names.join(", ")}`);
    }
  }

  if (report.unknownColumns.length > 0) {
    lines.push("");
    lines.push(`Unknown columns (present in CSV, not mapped): ${report.unknownColumns.join(", ")}`);
  }

  if (report.fieldsWithNoSourceColumn.length > 0) {
    lines.push("");
    lines.push(
      `Person fields with no source column in this CSV: ${report.fieldsWithNoSourceColumn.join(", ")}`,
    );
  }

  lines.push("");
  lines.push("Missing values (per field, across imported players):");
  for (const [field, count] of Object.entries(report.missingValueCounts)) {
    if (count > 0) lines.push(`  - ${field}: ${count}/${report.totalPlayersImported}`);
  }

  lines.push("");
  lines.push(`Warnings: ${report.warnings.length}`);
  for (const warning of report.warnings) {
    lines.push(`  - ${warning}`);
  }
  lines.push("");

  console.log(lines.join("\n"));
}

export function skippedRow(name: string, reason: string): SkippedRow {
  return { name, reason };
}
