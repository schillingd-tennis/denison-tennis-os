import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";

test("0020 hosted auth security migration defines app_users and denies anon", () => {
  const sqlPath = path.join(
    process.cwd(),
    "supabase/migrations/0020_hosted_auth_security.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");

  assert.match(sql, /create table if not exists public\.app_users/);
  assert.match(sql, /auth_user_id uuid not null unique references auth\.users/);
  assert.match(sql, /access_level in \('admin', 'read_only'\)/);
  assert.match(sql, /create or replace function public\.app_is_admin\(\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /alter table public\.roles enable row level security/);
  assert.match(sql, /alter table public\.statuses enable row level security/);
  assert.match(sql, /revoke all on table public\.%I from anon/);
  assert.match(sql, /if not public\.app_is_admin\(\)/);
  assert.doesNotMatch(sql, /using \(true\)/);
  assert.doesNotMatch(sql, /to anon/);
});
