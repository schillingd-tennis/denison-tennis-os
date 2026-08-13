/**
 * BP-015 / BP-022E / BP-026B / BP-029A — Supabase Seed Generator.
 *
 * Reads `src/features/people/data.ts` and writes:
 * - `supabase/seed.sql` — INSERT + ON CONFLICT **fill missing only**
 * - `supabase/seed-force-refresh.sql` — **disabled stub** (BP-029A)
 *
 * System of record: Supabase. Airtable CSV is bootstrap / fill-null only.
 * Never overwrites populated Supabase values on normal seed.
 *
 * Usage: `npm run db:generate-seed`
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { people } from "../src/features/people/data";
import { listPersonDbColumns } from "../src/features/people/fieldCatalog";
import { personToRow } from "../src/features/people/supabaseMapping";

import {
  FORCE_REFRESH_DISABLED_MESSAGE,
  fillNullAssignment,
  fillNullConflictColumns,
} from "./fieldOwnership";

const SEED_PATH = resolve(process.cwd(), "supabase/seed.sql");
const FORCE_PATH = resolve(process.cwd(), "supabase/seed-force-refresh.sql");

/** Insert column list — derived from Field Catalog `dbColumn` (BP-038B). */
const COLUMNS = listPersonDbColumns();

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

/** Normal seed: all importable profile columns fill NULLs only. */
function buildFillNullAssignments(): string {
  return fillNullConflictColumns().map(fillNullAssignment).join(",\n    ");
}

function buildFillNullHeader(): string {
  const generated = new Date().toISOString();
  return [
    "-- BP-029A — Generated seed data for production_people (fill missing only).",
    "--",
    "-- GENERATED FILE — do not hand-edit. Produced by `npm run db:generate-seed`",
    "-- from src/features/people/data.ts (Airtable CSV bootstrap adapter).",
    "--",
    `-- Generated: ${generated}`,
    `-- Records: ${people.length}`,
    "--",
    "-- ON CONFLICT: coalesce(existing, excluded) for all importable profile fields.",
    "-- Existing Supabase values are never overwritten (including by NULL/blank).",
    "-- Apply with: npm run db:seed",
    "-- Airtable Force Refresh hard-replace is DISABLED (BP-029A).",
    "-- Full wipe only via: npm run db:reset",
    "",
  ].join("\n");
}

/** BP-029A — do not emit hard-replace upserts; applying this file fails closed. */
function buildForceRefreshDisabledSql(): string {
  const generated = new Date().toISOString();
  const escaped = FORCE_REFRESH_DISABLED_MESSAGE.replace(/'/g, "''");
  return [
    "-- BP-029A — Force Refresh From Airtable is DISABLED.",
    "--",
    "-- GENERATED FILE — do not hand-edit. Produced by `npm run db:generate-seed`",
    `-- Generated: ${generated}`,
    "--",
    "-- Supabase is the permanent system of record. Airtable may only create",
    "-- missing People and fill NULL fields via supabase/seed.sql.",
    "-- This file intentionally raises if applied.",
    "",
    "do $bp029a$",
    "begin",
    `  raise exception '${escaped}';`,
    "end",
    "$bp029a$;",
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

  writeFileSync(SEED_PATH, `${buildFillNullHeader()}${buildStatements(fillNull)}\n`, "utf-8");
  writeFileSync(FORCE_PATH, buildForceRefreshDisabledSql(), "utf-8");

  console.log(`Wrote ${people.length} upsert statements to supabase/seed.sql (fill missing only)`);
  console.log(
    "Wrote supabase/seed-force-refresh.sql as DISABLED stub (BP-029A — no Airtable hard-replace)",
  );
  console.log(
    `Fill-null conflict columns: ${fillNullConflictColumns().length} (Imported Once → OS Managed)`,
  );
}

main();
