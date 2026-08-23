/** Repeatable Interactions _ Contacts.csv import. Dry-run unless --apply is supplied. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

import {
  INTERACTION_SOURCE_SYSTEM,
  analyzeInteractionRows,
  applyBlockedReasons,
  canApply,
  exclusiveSkipCount,
  type ImportAnalysis,
  type InteractionCsvRow,
  type MappedInteractionRow,
  type RecruitCandidate,
  type SkippedInteractionRow,
  type TournamentCandidate,
} from "../src/features/interactions/csvImport";

loadEnvConfig(process.cwd());

type RoleJoin = { key: string } | { key: string }[] | null;

type PersonRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  role?: RoleJoin;
};

function resolveCsvPath(arg?: string): string {
  if (arg) return resolve(arg);
  const candidates = [
    resolve(process.cwd(), "private-imports/Interactions _ Contacts.csv"),
    resolve(homedir(), "Downloads/Interactions _ Contacts.csv"),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      "Provide the path to Interactions _ Contacts.csv, or place it at private-imports/Interactions _ Contacts.csv or ~/Downloads/Interactions _ Contacts.csv.",
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

function client(): SupabaseClient {
  return createClient(appUrl(), serviceRoleKey(), { auth: { persistSession: false } });
}

function roleKey(role: RoleJoin): string | null {
  if (!role) return null;
  if (Array.isArray(role)) return role[0]?.key ?? null;
  return role.key ?? null;
}

async function loadRecruits(db: SupabaseClient): Promise<RecruitCandidate[]> {
  const [{ data: profiles, error: profileError }, { data: people, error: peopleError }] = await Promise.all([
    db.from("recruit_profiles").select("person_id"),
    db
      .from("production_people")
      .select("id, first_name, last_name, preferred_name, role:roles!inner(key)")
      .eq("role.key", "recruit"),
  ]);
  if (profileError) throw new Error(`Could not read recruit_profiles: ${profileError.message}`);
  if (peopleError) throw new Error(`Could not read production_people: ${peopleError.message}`);
  const profileIds = new Set((profiles ?? []).map((row) => row.person_id).filter(Boolean));
  return ((people ?? []) as PersonRow[])
    .filter((person) => profileIds.has(person.id) && roleKey(person.role ?? null) === "recruit")
    .map((person) => ({
      id: person.id,
      firstName: person.first_name ?? "",
      lastName: person.last_name ?? "",
      preferredName: person.preferred_name,
      label: `${(person.preferred_name || person.first_name || "").trim()} ${person.last_name ?? ""}`.trim(),
    }));
}

async function loadTournaments(db: SupabaseClient): Promise<TournamentCandidate[]> {
  const { data, error } = await db.from("recruiting_tournaments").select("id, name");
  if (error) throw new Error(`Could not read recruiting_tournaments: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

async function loadExistingKeys(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db
    .from("recruiting_interactions")
    .select("source_key")
    .eq("source_system", INTERACTION_SOURCE_SYSTEM);
  if (error) {
    if (/does not exist|schema cache|could not find/i.test(error.message)) return new Set();
    throw new Error(`Could not read recruiting_interactions: ${error.message}`);
  }
  return new Set(
    (data ?? []).map((row) => row.source_key).filter((value): value is string => Boolean(value)),
  );
}

function skippedLine(row: SkippedInteractionRow): string {
  const player = row.player || "(no Player)";
  const extra = row.notesPreview ? ` | notes: ${row.notesPreview}` : "";
  return `${player} — ${row.detail}${extra}`;
}

function printList(title: string, rows: SkippedInteractionRow[]): void {
  console.log(`${title}: ${rows.length}`);
  for (const row of rows) {
    console.log(`  row ${row.rowNumber}: ${skippedLine(row)}`);
  }
}

function printReport(file: string, analysis: ImportAnalysis, recruitCount: number): void {
  console.log(`CSV: ${file}`);
  console.log(`App database: ${appUrl()}`);
  console.log(`Recruit candidates (role=recruit with recruit_profiles): ${recruitCount}`);
  console.log("");
  console.log("CONTACT TYPE MAPPING");
  for (const mapping of analysis.contactTypeMappings) {
    console.log(`  ${mapping.source} → ${mapping.normalized}`);
  }
  console.log("");
  console.log("TOURNAMENT MATCHING");
  if (analysis.tournamentMatches.length === 0) {
    console.log("  (no tournament names in CSV)");
  }
  for (const mapping of analysis.tournamentMatches) {
    console.log(`  ${mapping.csvName} → ${mapping.osName}`);
  }
  console.log("");
  console.log("EMPTY SOURCE ROWS", analysis.emptySourceRows.length);
  for (const row of analysis.emptySourceRows) {
    console.log(`  row ${row.rowNumber}: ${row.reason}`);
  }
  console.log("INTENTIONALLY EXCLUDED", analysis.intentionallyExcluded.length);
  for (const row of analysis.intentionallyExcluded) {
    console.log(
      `  row ${row.rowNumber}: ${row.reason} | date=${row.sourceDate || "(none)"} | loggedBy=${row.loggedBy || "(none)"} | notes: ${row.notesPreview || "(none)"} | nextSteps: ${row.nextSteps || "(none)"}`,
    );
  }
  printList("UNMATCHED PEOPLE", analysis.unmatchedPeople);
  printList("AMBIGUOUS PEOPLE", analysis.ambiguousPeople);
  printList("MISSING PLAYER", analysis.missingPlayer);
  printList("UNMATCHED TOURNAMENTS", analysis.unmatchedTournaments);
  printList("UNKNOWN INTERACTION TYPES", analysis.unknownTypes);
  printList("INVALID / MISSING DATES", analysis.invalidDates);
  console.log(`DUPLICATES / EXISTING SOURCE KEYS: ${analysis.existingSourceKeys.length}`);
  for (const row of analysis.existingSourceKeys) {
    console.log(`  row ${row.rowNumber} ${row.player}: ${row.sourceKey}`);
  }
  console.log("");
  console.log("TOTAL CSV ROWS", analysis.totalRows);
  console.log("EMPTY SOURCE ROWS", analysis.emptySourceRows.length);
  console.log("INTENTIONALLY EXCLUDED", analysis.intentionallyExcluded.length);
  console.log("ACTUAL INTERACTION SOURCE ROWS", analysis.actualInteractionRows);
  console.log("READY TO IMPORT", analysis.ready.length);
  console.log("UNMATCHED PEOPLE", analysis.unmatchedPeople.length);
  console.log("AMBIGUOUS PEOPLE", analysis.ambiguousPeople.length);
  console.log("MISSING PLAYER", analysis.missingPlayer.length);
  console.log("UNMATCHED TOURNAMENTS", analysis.unmatchedTournaments.length);
  console.log("UNKNOWN INTERACTION TYPES", analysis.unknownTypes.length);
  console.log("INVALID / MISSING DATES", analysis.invalidDates.length);
  console.log("DUPLICATES / EXISTING SOURCE KEYS", analysis.existingSourceKeys.length);
  console.log("BLOCKING ERRORS", analysis.blockingErrors);
  const exclusive =
    exclusiveSkipCount(analysis, "missing_player") +
    exclusiveSkipCount(analysis, "unmatched_person") +
    exclusiveSkipCount(analysis, "ambiguous_person") +
    exclusiveSkipCount(analysis, "unmatched_tournament") +
    exclusiveSkipCount(analysis, "unknown_type") +
    exclusiveSkipCount(analysis, "invalid_date");
  console.log(
    `RECONCILE (empty ${analysis.emptySourceRows.length} + excluded ${analysis.intentionallyExcluded.length} + exclusive blocking ${exclusive} + ready ${analysis.ready.length} = ${analysis.emptySourceRows.length + analysis.intentionallyExcluded.length + exclusive + analysis.ready.length})`,
  );
}

async function applyRows(db: SupabaseClient, rows: MappedInteractionRow[]): Promise<void> {
  const payload = rows.map((row) => row.record);
  for (let index = 0; index < payload.length; index += 200) {
    const { error } = await db
      .from("recruiting_interactions")
      .upsert(payload.slice(index, index + 200), { onConflict: "source_system,source_key" });
    if (error) throw new Error(`Interaction import failed: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const file = resolveCsvPath(fileArg);
  const rows = parse(readFileSync(file, "utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as InteractionCsvRow[];

  const db = client();
  const [recruits, tournaments] = await Promise.all([loadRecruits(db), loadTournaments(db)]);
  let existingKeys = new Set<string>();
  try {
    existingKeys = await loadExistingKeys(db);
  } catch (error) {
    if (apply) throw error;
    console.log(
      `Could not read existing rows for insert/update split: ${error instanceof Error ? error.message : error}`,
    );
  }

  const analysis = analyzeInteractionRows(rows, recruits, tournaments, existingKeys);
  printReport(file, analysis, recruits.length);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write to the app database.");
    return;
  }

  if (!canApply(analysis)) {
    console.error("Refusing to apply: unresolved critical mappings.");
    console.error(`Blocked by: ${applyBlockedReasons(analysis).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  if (analysis.ready.length === 0) {
    console.log("No valid rows to import.");
    return;
  }

  await applyRows(db, analysis.ready);
  console.log(`Upserted ${analysis.ready.length} interactions into recruiting_interactions.`);
}

if (process.argv[1]?.endsWith("import-interactions.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
