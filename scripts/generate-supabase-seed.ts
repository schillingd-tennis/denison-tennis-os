/**
 * BP-015 / BP-021 / BP-022E — Supabase Seed Generator.
 *
 * Reads the current roster from `src/features/people/data.ts` and writes
 * `supabase/seed.sql`: `INSERT ... ON CONFLICT (id) DO UPDATE` that updates
 * **only provider-synced columns** (current sync source: Airtable CSV
 * bootstrap). Application-owned fields (UTR, WTN, notes, …) are preserved
 * on conflict — see `scripts/fieldOwnership.ts` / `docs/SYSTEM_OF_RECORD.md`.
 *
 * Usage: `npm run db:generate-seed`
 *
 * After BP-021, run migration `0003_people_roles_and_coaches.sql` before
 * (or with) this seed so `roles` / `title` columns exist.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { people } from "../src/features/people/data";
import { personToRow } from "../src/features/people/supabaseMapping";

import { EXTERNAL_SYNC_COLUMNS } from "./fieldOwnership";

const OUTPUT_PATH = resolve(process.cwd(), "supabase/seed.sql");

const COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "status",
  "roles",
  "title",
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

function sqlLiteral(value: unknown, column?: string): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (Array.isArray(value)) {
    // `roles` is Postgres text[]; relationship objects (and empty []) stay jsonb.
    if (column === "roles") {
      if (value.length === 0) return `'{}'::text[]`;
      const items = value.map((item) => sqlLiteral(item)).join(", ");
      return `ARRAY[${items}]::text[]`;
    }
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  if (typeof value === "object" && value !== null) {
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
}

/** Only provider-synced columns — never wipe app-owned values on re-seed. */
function buildUpdateAssignments(): string {
  return EXTERNAL_SYNC_COLUMNS.map((column) => `${column} = excluded.${column}`).join(",\n    ");
}

function main(): void {
  const header = [
    "-- BP-015 / BP-021 / BP-022E / BP-023A — Generated seed data for production_people.",
    "--",
    `-- GENERATED FILE — do not hand-edit. Produced by \`npm run db:generate-seed\``,
    "-- (scripts/generate-supabase-seed.ts) from src/features/people/data.ts",
    "-- (External People sync provider via npm run import:players — currently Airtable CSV).",
    "-- Re-run the generator to regenerate after data.ts changes.",
    "--",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Records: ${people.length}`,
    "--",
    "-- Requires migrations through 0003_people_roles_and_coaches.sql for roles/title.",
    "-- ON CONFLICT updates provider-synced columns only (BP-022E / BP-023A).",
    "-- Application-owned fields (utr, wtn, notes, …) are preserved on re-seed.",
    "-- Full wipe still happens only via `npm run db:reset` (drops the database).",
    "",
  ].join("\n");

  const columnList = COLUMNS.join(", ");
  const updateAssignments = buildUpdateAssignments();

  const statements = people
    .map((person) => {
      const row = personToRow(person);
      const values = COLUMNS.map((column) => sqlLiteral(row[column], column)).join(", ");
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
  console.log(
    `ON CONFLICT updates ${EXTERNAL_SYNC_COLUMNS.length} provider-synced columns; app-owned fields preserved.`,
  );
}

main();
