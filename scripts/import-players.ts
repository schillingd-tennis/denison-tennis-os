/**
 * BP-012 — Production People Import.
 *
 * Reads `private-imports/Players.csv`, validates and normalizes every row,
 * maps it onto the `Person` model, and regenerates
 * `src/features/people/data.ts` — the single data source the Team module
 * reads from. Also writes a JSON import report alongside the source CSV
 * (both live in the gitignored `private-imports/` folder).
 *
 * Usage: `npm run import:players`
 *
 * Scope: Players only. Parents, coaches, and Airtable sync are out of
 * scope for this blueprint and are handled by later blueprints.
 */
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Person } from "../src/features/people/types";
import { readCsvRows } from "./import/csv";
import { isCoachRow, KNOWN_COLUMNS, FIELDS_WITH_NO_SOURCE_COLUMN, mapRowToPlayer } from "./import/mapPlayer";
import { generateDataFileContents } from "./import/generateDataFile";
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
  const people: Person[] = [];
  const skipped: SkippedRow[] = [];
  const warnings: string[] = [];

  for (const row of rows) {
    const name = (row["Name"] ?? "").trim() || "(unnamed row)";

    if (isCoachRow(row)) {
      skipped.push(
        skippedRow(name, "Class = Coach — out of scope for BP-012 (Players only); coaches import in a later blueprint."),
      );
      continue;
    }

    const result = mapRowToPlayer(row, usedIds, referenceDate);

    if ("error" in result) {
      skipped.push(skippedRow(name, result.error));
      continue;
    }

    const { person, warnings: rowWarnings } = result;
    people.push(person);
    for (const warning of rowWarnings) {
      warnings.push(`${name}: ${warning}`);
    }
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

  // Sort the roster the same way the Team Directory does by default, so a
  // diff of the generated file is easy to read: last name, then first name.
  people.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

  const dataFileContents = generateDataFileContents(people, timestamp);
  writeFileSync(OUTPUT_DATA_PATH, dataFileContents, "utf-8");

  writeReport(report, REPORT_PATH);
  printReportSummary(report);

  console.log(`Wrote ${people.length} players to src/features/people/data.ts`);
  console.log(`Wrote import report to private-imports/import-report.json`);
}

main();
