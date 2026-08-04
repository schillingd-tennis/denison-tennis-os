/**
 * BP-015 — Supabase Seed Generator.
 *
 * Reads the current roster from `src/features/people/data.ts` (the BP-012
 * generated file) and writes `supabase/seed.sql`: idempotent `INSERT ...
 * ON CONFLICT (id) DO UPDATE` statements that load the same roster into the
 * `production_people` table.
 *
 * This is how "migrate all current roster data" stays reproducible: rerun
 * this script whenever `data.ts` changes (e.g. after `npm run
 * import:players`), then re-run `supabase/seed.sql` in the Supabase SQL
 * Editor to bring the table back in sync. `data.ts` remains untouched and
 * is not read from at runtime once BP-015 lands — this script is the only
 * remaining reader of it, and only at seed-generation time.
 *
 * Usage: `npm run db:generate-seed`
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { people } from "../src/features/people/data";
import { personToRow } from "../src/features/people/supabaseMapping";

const OUTPUT_PATH = resolve(process.cwd(), "supabase/seed.sql");

const COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "status",
  "first_name",
  "middle_name",
  "last_name",
  "preferred_name",
  "date_of_birth",
  "photo_url",
  "cell_phone",
  "personal_email",
  "denison_email",
  "preferred_contact_method",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "zip_code",
  "country",
  "class_year",
  "major",
  "minor",
  "denison_id",
  "dorm",
  "room_number",
  "utr",
  "wtn",
  "dominant_hand",
  "height_inches",
  "weight_lbs",
  "player_status",
  "relationships",
  "notes",
] as const;

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
}

function buildUpdateAssignments(): string {
  return COLUMNS.filter((column) => column !== "id")
    .map((column) => `${column} = excluded.${column}`)
    .join(",\n    ");
}

function main(): void {
  const header = [
    "-- BP-015 — Generated seed data for production_people.",
    "--",
    `-- GENERATED FILE — do not hand-edit. Produced by \`npm run db:generate-seed\``,
    "-- (scripts/generate-supabase-seed.ts) from src/features/people/data.ts.",
    "-- Re-run the generator to regenerate after data.ts changes.",
    "--",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Records: ${people.length}`,
    "--",
    "-- Run this in the Supabase SQL Editor after supabase/migrations/0001_create_production_people.sql.",
    "-- Safe to re-run: each row is upserted by id.",
    "",
  ].join("\n");

  const columnList = COLUMNS.join(", ");
  const updateAssignments = buildUpdateAssignments();

  // Per-row upserts (rather than one multi-row INSERT) so the file is easy
  // to diff and any single row's failure is easy to localize.
  const statements = people
    .map((person) => {
      const row = personToRow(person);
      const values = COLUMNS.map((column) => sqlLiteral(row[column])).join(", ");
      return [
        `insert into public.production_people (${columnList})`,
        `values (${values})`,
        "on conflict (id) do update set",
        `  ${updateAssignments};`,
      ].join("\n");
    })
    .join("\n\n");

  writeFileSync(OUTPUT_PATH, `${header}${statements}\n`, "utf-8");

  console.log(`Wrote ${people.length} upsert statements to supabase/seed.sql`);
}

main();
