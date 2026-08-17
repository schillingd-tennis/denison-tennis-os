import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";

test("migration defines atomic Coach Rank RPCs without backfill", () => {
  const sqlPath = path.join(
    process.cwd(),
    "supabase/migrations/0016_recruit_coach_rank.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");

  assert.match(sql, /add column if not exists coach_rank integer/);
  assert.match(sql, /create or replace function public\.apply_recruit_class_coach_ranks/);
  assert.match(sql, /create or replace function public\.reassign_recruit_class_year/);
  assert.match(sql, /for update/);
  assert.match(sql, /grant execute on function public\.apply_recruit_class_coach_ranks/);
  assert.match(sql, /grant execute on function public\.reassign_recruit_class_year/);
  assert.match(sql, /Existing rows remain NULL \(no backfill\)/);
});
