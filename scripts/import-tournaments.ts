/** Repeatable Tournaments.csv import. Dry-run unless --apply is supplied. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

import {
  mapTournamentCsvRow,
  unmappedHeaders,
  type InvalidImportRow,
  type MappedImportRow,
  type TournamentCsvRow,
  type TournamentImportRecord,
} from "../src/features/tournaments/csvImport";

loadEnvConfig(process.cwd());

type ExistingRow = { id: string; source_key: string | null };

function resolveCsvPath(arg?: string): string {
  if (arg) return resolve(arg);
  const candidates = [
    resolve(process.cwd(), "private-imports/Tournaments.csv"),
    resolve(homedir(), "Downloads/Tournaments.csv"),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      "Provide the path to Tournaments.csv, or place it at private-imports/Tournaments.csv or ~/Downloads/Tournaments.csv.",
    );
  }
  return found;
}

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.");
  return url;
}

function serviceRoleKey(): string {
  const fromEnv =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SECRET_KEY;
  if (fromEnv) return fromEnv;
  if (!/127\.0\.0\.1|localhost/.test(appUrl())) {
    throw new Error(
      "--apply requires SUPABASE_SERVICE_ROLE_KEY for the same project as NEXT_PUBLIC_SUPABASE_URL.",
    );
  }
  const output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const match = output.match(/^SERVICE_ROLE_KEY=(.+)$/m);
  if (!match) throw new Error("Could not read SERVICE_ROLE_KEY from supabase status.");
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function printDryRun(
  file: string,
  headers: string[],
  mapped: MappedImportRow[],
  invalid: InvalidImportRow[],
  existingKeys: Set<string>,
): void {
  const insert = mapped.filter((row) => !existingKeys.has(row.record.source_key));
  const update = mapped.filter((row) => existingKeys.has(row.record.source_key));
  const unmapped = unmappedHeaders(headers);
  console.log(`CSV: ${file}`);
  console.log(`App database: ${appUrl()}`);
  console.log(`Rows discovered: ${mapped.length + invalid.length}`);
  console.log(`Rows valid: ${mapped.length}`);
  console.log(`Rows invalid: ${invalid.length}`);
  console.log(`Rows that would be inserted: ${insert.length}`);
  console.log(`Rows that would be updated: ${update.length}`);
  console.log(`Rows skipped: ${invalid.length}`);
  if (unmapped.length > 0) {
    console.log(`Unmapped CSV headers (not discarded; add a migration if these appear): ${unmapped.join(", ")}`);
  }
  for (const row of invalid) {
    console.log(`  skip row ${row.sourceIndex} ${row.name}: ${row.reasons.join("; ")}`);
  }
  const warned = mapped.filter((row) => row.warnings.length > 0);
  if (warned.length > 0) {
    console.log("Valid rows with warnings:");
    for (const row of warned) {
      console.log(`  row ${row.sourceIndex} ${row.record.name}: ${row.warnings.join("; ")}`);
    }
  }
}

async function loadExistingKeys(url: string, key: string): Promise<Set<string>> {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.from("recruiting_tournaments").select("id, source_key");
  if (error) throw new Error(`Could not read recruiting_tournaments: ${error.message}`);
  return new Set(
    ((data as ExistingRow[] | null) ?? []).map((row) => row.source_key).filter((value): value is string => Boolean(value)),
  );
}

async function applyRows(url: string, key: string, rows: TournamentImportRecord[]): Promise<void> {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await client.from("recruiting_tournaments").upsert(rows, { onConflict: "source_key" });
  if (error) throw new Error(`Tournament import failed: ${error.message}`);
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const file = resolveCsvPath(fileArg);
  const records = parse(readFileSync(file, "utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as TournamentCsvRow[];
  const headers = records.length > 0 ? Object.keys(records[0]).map((header) => header.replace(/^\uFEFF/, "").trim()) : [];
  const mapped: MappedImportRow[] = [];
  const invalid: InvalidImportRow[] = [];
  for (const [index, row] of records.entries()) {
    const result = mapTournamentCsvRow(row, index);
    if ("reasons" in result) invalid.push(result);
    else mapped.push(result);
  }

  let existingKeys = new Set<string>();
  try {
    existingKeys = await loadExistingKeys(appUrl(), serviceRoleKey());
  } catch (error) {
    if (apply) throw error;
    console.log(`Could not read existing rows for insert/update split: ${error instanceof Error ? error.message : error}`);
  }

  printDryRun(file, headers, mapped, invalid, existingKeys);
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write to the app database.");
    return;
  }
  if (mapped.length === 0) {
    console.log("No valid rows to import.");
    return;
  }
  await applyRows(
    appUrl(),
    serviceRoleKey(),
    mapped.map((row) => row.record),
  );
  console.log(`Upserted ${mapped.length} tournaments into recruiting_tournaments.`);
}

export { mapTournamentCsvRow };

if (process.argv[1]?.endsWith("import-tournaments.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
