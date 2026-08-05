/**
 * BP-015 / BP-022E / BP-026B — Supabase Seed Generator.
 *
 * Reads `src/features/people/data.ts` and writes:
 * - `supabase/seed.sql` — INSERT + ON CONFLICT **fill missing only**
 * - `supabase/seed-force-refresh.sql` — INSERT + ON CONFLICT **force provider**
 *
 * System of record: Supabase. Import sources (Airtable CSV today) never
 * overwrite existing values unless Force Refresh is applied explicitly.
 *
 * Usage: `npm run db:generate-seed`
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { people } from "../src/features/people/data";
import { personToRow } from "../src/features/people/supabaseMapping";

import {
  APP_AUTHORITATIVE_COLUMNS,
  PROVIDER_IMPORT_COLUMNS,
  fillNullAssignment,
  forceRefreshAssignment,
} from "./fieldOwnership";

const SEED_PATH = resolve(process.cwd(), "supabase/seed.sql");
const FORCE_PATH = resolve(process.cwd(), "supabase/seed-force-refresh.sql");

const COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "role_id",
  "status_id",
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

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (Array.isArray(value)) {
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

/**
 * Normal seed: provider + app-authoritative columns fill NULLs only.
 * Never stamps `updated_at` from the snapshot (preserves edit times).
 */
function buildFillNullAssignments(): string {
  const columns = [
    ...PROVIDER_IMPORT_COLUMNS,
    ...APP_AUTHORITATIVE_COLUMNS.filter((column) => column !== "created_at"),
  ];
  return columns.map(fillNullAssignment).join(",\n    ");
}

/**
 * Force refresh: hard-replace provider-import columns only.
 * App-authoritative columns (UTR, WTN, notes, …) are omitted — Tennis OS wins.
 */
function buildForceRefreshAssignments(): string {
  return [
    ...PROVIDER_IMPORT_COLUMNS.map(forceRefreshAssignment),
    "updated_at = excluded.updated_at",
  ].join(",\n    ");
}

function buildHeader(mode: "fill-nulls" | "force-refresh"): string {
  const generated = new Date().toISOString();
  if (mode === "fill-nulls") {
    return [
      "-- BP-026B — Generated seed data for production_people (fill missing only).",
      "--",
      "-- GENERATED FILE — do not hand-edit. Produced by `npm run db:generate-seed`",
      "-- from src/features/people/data.ts (import source adapter; currently Airtable CSV).",
      "--",
      `-- Generated: ${generated}`,
      `-- Records: ${people.length}`,
      "--",
      "-- ON CONFLICT: coalesce(existing, excluded) for importable + app fields.",
      "-- Existing Supabase values are never overwritten. Apply with: npm run db:seed",
      "-- Force overwrite of provider columns: npm run db:seed:force-refresh",
      "-- Full wipe only via: npm run db:reset",
      "",
    ].join("\n");
  }

  return [
    "-- BP-026B — Force Refresh From Provider seed for production_people.",
    "--",
    "-- GENERATED FILE — do not hand-edit. Produced by `npm run db:generate-seed`",
    "--",
    `-- Generated: ${generated}`,
    `-- Records: ${people.length}`,
    "--",
    "-- ON CONFLICT: HARD-REPLACES provider-import columns (role, status, hometown,",
    "-- contact, class, D#, names, …) from the import snapshot — including NULLs.",
    "-- App-authoritative columns (utr, wtn, notes, relationships, …) are NOT touched.",
    "-- Apply only via: npm run db:seed:force-refresh",
    "",
  ].join("\n");
}

function buildStatements(updateAssignments: string): string {
  const columnList = COLUMNS.join(", ");
  return people
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
}

function main(): void {
  const fillNull = buildFillNullAssignments();
  const force = buildForceRefreshAssignments();

  writeFileSync(SEED_PATH, `${buildHeader("fill-nulls")}${buildStatements(fillNull)}\n`, "utf-8");
  writeFileSync(FORCE_PATH, `${buildHeader("force-refresh")}${buildStatements(force)}\n`, "utf-8");

  console.log(`Wrote ${people.length} upsert statements to supabase/seed.sql (fill missing only)`);
  console.log(
    `Wrote ${people.length} upsert statements to supabase/seed-force-refresh.sql (force provider columns)`,
  );
  console.log(
    `Provider-import columns: ${PROVIDER_IMPORT_COLUMNS.length}; app-authoritative protected on force: ${APP_AUTHORITATIVE_COLUMNS.length}`,
  );
}

main();
