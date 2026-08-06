/**
 * BP-029A — Ownership lock invariants (no test runner required).
 *
 * Usage: `npx tsx scripts/assert-ownership-lock.ts`
 */
import {
  FORCE_REFRESH_DISABLED_MESSAGE,
  IMPORTED_ONCE_COLUMNS,
  OS_MANAGED_COLUMNS,
  FUTURE_PROVIDER_MANAGED_COLUMNS,
  fillNullAssignment,
  fillNullConflictColumns,
} from "./fieldOwnership";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok — ${message}`);
  }
}

function main(): void {
  assert(IMPORTED_ONCE_COLUMNS.length > 0, "IMPORTED_ONCE_COLUMNS is non-empty");
  assert(
    OS_MANAGED_COLUMNS.length === IMPORTED_ONCE_COLUMNS.length,
    "OS_MANAGED_COLUMNS matches Imported Once (Airtable has no continuing overwrite set)",
  );
  assert(
    FUTURE_PROVIDER_MANAGED_COLUMNS.length === 0,
    "FUTURE_PROVIDER_MANAGED_COLUMNS empty (Airtable not a provider exception)",
  );

  for (const column of fillNullConflictColumns()) {
    const sql = fillNullAssignment(column);
    assert(
      sql.includes("coalesce(public.production_people.") && sql.includes("excluded."),
      `fill-null uses coalesce for ${column}`,
    );
    assert(!/^\w+ = excluded\./.test(sql), `no hard-replace assignment for ${column}`);
  }

  const required = [
    "first_name",
    "last_name",
    "city",
    "role_id",
    "status_id",
    "class_year",
    "utr",
    "wtn",
    "notes",
    "cell_phone",
    "denison_id",
  ] as const;
  for (const column of required) {
    assert(
      (IMPORTED_ONCE_COLUMNS as readonly string[]).includes(column),
      `Imported Once includes ${column}`,
    );
  }

  assert(
    FORCE_REFRESH_DISABLED_MESSAGE.includes("BP-029A"),
    "Force Refresh disabled message present",
  );

  const seedPath = resolve(process.cwd(), "supabase/seed.sql");
  const forcePath = resolve(process.cwd(), "supabase/seed-force-refresh.sql");
  assert(existsSync(seedPath), "supabase/seed.sql exists");
  assert(existsSync(forcePath), "supabase/seed-force-refresh.sql exists");

  if (existsSync(seedPath)) {
    const seed = readFileSync(seedPath, "utf-8");
    assert(seed.includes("coalesce(public.production_people."), "seed.sql uses coalesce fill-null");
    assert(
      !seed.includes("on conflict (id) do update set\n  role_id = excluded.role_id"),
      "seed.sql does not hard-replace role_id",
    );
  }

  if (existsSync(forcePath)) {
    const force = readFileSync(forcePath, "utf-8");
    assert(force.includes("raise exception"), "force-refresh.sql is a disabled stub");
    assert(!force.includes("on conflict (id) do update"), "force-refresh.sql has no upsert overwrite");
  }

  if (process.exitCode) {
    console.error("\nBP-029A ownership lock assertions failed.");
    process.exit(1);
  }
  console.log("\nBP-029A ownership lock assertions passed.");
}

main();
