/** Repeatable private academic-history import. Dry-run unless --apply is supplied. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { canonicalImportName, normalizeAcademicName, parseGradeImport } from "../src/features/teamGrades/import";

loadEnvConfig(process.cwd());

type PersonRow = { id: string; first_name: string; last_name: string; preferred_name: string | null };

const knownRosterIds: Record<string, string> = {
  "Grahame Turner, Archie": "player-archie-turner",
  "Osmo, Tomer": "player-tomer-ozmo",
  "Garcia Colin, Daniel": "player-daniel-garcia",
  "Kallambella, Arya": "player-arya-ganapathy-kallambella",
};

function sourcePath(arg?: string): string {
  const path = resolve(arg ?? "private-imports/team-grades.txt");
  if (!existsSync(path)) throw new Error(`Grade source not found: ${path}`);
  return path;
}

function appUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
  return value;
}

function serviceRoleKey(): string {
  if (/127\.0\.0\.1|localhost/.test(appUrl())) {
    const output = execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8" });
    const match = output.match(/^SERVICE_ROLE_KEY=(.+)$/m);
    if (!match) throw new Error("Could not read the local Supabase service-role key.");
    return match[1].trim().replace(/^["']|["']$/g, "");
  }
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SECRET_KEY;
  if (value) return value;
  throw new Error("--apply requires the hosted project's service-role key.");
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const arg = process.argv.slice(2).find((value) => !value.startsWith("--"));
  const file = sourcePath(arg);
  const rows = parseGradeImport(readFileSync(file, "utf8"));
  const client = createClient(appUrl(), serviceRoleKey(), { auth: { persistSession: false } });
  const { data, error } = await client.from("production_people").select("id,first_name,last_name,preferred_name");
  if (error) throw new Error(`Could not load roster: ${error.message}`);

  const people = (data as PersonRow[]) ?? [];
  const byName = new Map<string, PersonRow[]>();
  for (const person of people) {
    for (const name of [`${person.first_name} ${person.last_name}`, `${person.preferred_name ?? ""} ${person.last_name}`]) {
      const key = normalizeAcademicName(name);
      if (!key) continue;
      byName.set(key, [...(byName.get(key) ?? []), person]);
    }
  }

  const resolved = rows.map((row) => {
    const canonicalName = canonicalImportName(row.sourceName);
    const fixedPerson = people.find((person) => person.id === knownRosterIds[row.sourceName]);
    const matches = fixedPerson ? [fixedPerson] : (byName.get(normalizeAcademicName(canonicalName)) ?? []);
    if (matches.length !== 1) throw new Error(`${row.sourceName} resolved to ${matches.length} roster records; import stopped.`);
    return { row, personId: matches[0].id, canonicalName };
  });
  const terms = [...new Map(rows.map((row) => [row.termKey, row])).values()];
  console.log(`Source: ${file}`);
  console.log(`Database: ${appUrl()}`);
  console.log(`Semesters: ${terms.length}`);
  console.log(`Grade records: ${resolved.length}`);
  console.log(`Unique players: ${new Set(resolved.map((item) => item.personId)).size}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  if (!apply) return;

  const { data: termData, error: termError } = await client.from("team_academic_terms").upsert(terms.map((term) => ({
    term_key: term.termKey, label: term.termLabel, season: term.season, calendar_year: term.calendarYear,
    academic_year: term.academicYear, sort_order: term.sortOrder, updated_at: new Date().toISOString(),
  })), { onConflict: "term_key" }).select("id,term_key");
  if (termError) throw new Error(`Could not upsert academic terms: ${termError.message}`);
  const termIds = new Map(((termData as Array<{ id: string; term_key: string }>) ?? []).map((term) => [term.term_key, term.id]));
  const records = resolved.map(({ row, personId }) => ({
    term_id: termIds.get(row.termKey), person_id: personId, credit_hours: row.creditHours,
    semester_gpa: row.semesterGpa, midterm_gpa: row.midtermGpa, updated_at: new Date().toISOString(),
  }));
  if (records.some((record) => !record.term_id)) throw new Error("A semester ID was not returned; no grade records were written.");
  const { error: recordError } = await client.from("team_academic_records").upsert(records, { onConflict: "term_id,person_id" });
  if (recordError) throw new Error(`Could not upsert academic records: ${recordError.message}`);
  console.log(`Applied ${records.length} academic records across ${terms.length} semesters.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
