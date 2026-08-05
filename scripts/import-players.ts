/**
 * BP-012 / BP-021 — Production People Import.
 *
 * Reads `private-imports/Players.csv`, validates and normalizes every row,
 * maps it onto the `Person` model (players, coaches, staff, alumni — same
 * path), merges duplicate name rows (e.g. alumni + coach), and regenerates
 * `src/features/people/data.ts`.
 *
 * Usage: `npm run import:players`
 *
 * Airtable remains the single source of truth — no hard-coded person overlays.
 */
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Person } from "../src/features/people/types";
import { readCsvRows } from "./import/csv";
import { KNOWN_COLUMNS, FIELDS_WITH_NO_SOURCE_COLUMN, mapRowToPerson } from "./import/mapPlayer";
import { generateDataFileContents } from "./import/generateDataFile";
import { mergePeopleByName } from "./import/mergePeople";
import { buildMissingValueCounts, printReportSummary, skippedRow, writeReport } from "./import/report";
import type { ImportReport, SkippedRow } from "./import/types";
import { findDuplicateDenisonIds, findDuplicateEmails } from "./import/validate";

const SOURCE_PATH = resolve(process.cwd(), "private-imports/Players.csv");
const OUTPUT_DATA_PATH = resolve(process.cwd(), "src/features/people/data.ts");
const REPORT_PATH = resolve(process.cwd(), "private-imports/import-report.json");

function main(): void {
  if (!existsSync(SOURCE_PATH)) {
    console.error(`Could not find ${SOURCE_PATH}.`);
    console.error("Place the exported roster at private-imports/Players.csv and re-run.");
    process.exitCode = 1;
    return;
  }

  const referenceDate = new Date();
  const { headers, rows } = readCsvRows(SOURCE_PATH);

  const usedIds = new Set<string>();
  const mapped: Person[] = [];
  const skipped: SkippedRow[] = [];
  const warnings: string[] = [];

  for (const row of rows) {
    const name = (row["Name"] ?? "").trim() || "(unnamed row)";
    const result = mapRowToPerson(row, usedIds, referenceDate);

    if ("error" in result) {
      skipped.push(skippedRow(name, result.error));
      continue;
    }

    const { person, warnings: rowWarnings } = result;
    mapped.push(person);
    for (const warning of rowWarnings) {
      warnings.push(`${name}: ${warning}`);
    }
  }

  const { people, mergeCount } = mergePeopleByName(mapped);
  if (mergeCount > 0) {
    warnings.push(
      `Merged ${mergeCount} duplicate name row(s) into a single Person (unioned roles; preferred populated fields).`,
    );
  }

  const unknownColumns = headers.filter((header) => !KNOWN_COLUMNS.includes(header));

  const duplicateDenisonIds = findDuplicateDenisonIds(people);
  const duplicateEmails = findDuplicateEmails(people);

  for (const dup of duplicateDenisonIds) {
    warnings.push(`Duplicate Denison ID "${dup.value}" shared by: ${dup.names.join(", ")}.`);
  }
  for (const dup of duplicateEmails) {
    warnings.push(`Duplicate email "${dup.value}" shared by: ${dup.names.join(", ")}.`);
  }

  const timestamp = referenceDate.toISOString();

  const report: ImportReport = {
    timestamp,
    source: "private-imports/Players.csv",
    totalRowsInFile: rows.length,
    totalPlayersImported: people.length,
    totalSkipped: skipped.length,
    skipped,
    warnings,
    duplicates: {
      denisonIds: duplicateDenisonIds,
      emails: duplicateEmails,
    },
    unknownColumns,
    fieldsWithNoSourceColumn: FIELDS_WITH_NO_SOURCE_COLUMN,
    missingValueCounts: buildMissingValueCounts(people),
  };

  people.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

  const dataFileContents = generateDataFileContents(people, timestamp);
  writeFileSync(OUTPUT_DATA_PATH, dataFileContents, "utf-8");

  writeReport(report, REPORT_PATH);
  printReportSummary(report);

  console.log(`Wrote ${people.length} people to src/features/people/data.ts`);
  console.log(`Wrote import report to private-imports/import-report.json`);
}

main();
