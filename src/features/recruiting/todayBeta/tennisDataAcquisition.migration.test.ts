import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/0070_tennis_data_acquisition.sql"),
  "utf8",
);

test("0070 creates one provider-neutral queue for UTR, TRN, and WTN", () => {
  assert.match(migration, /create table public\.tennis_data_workers/);
  assert.match(migration, /create table public\.tennis_data_jobs/);
  assert.match(migration, /provider in \('utr', 'trn', 'wtn'\)/);
  assert.doesNotMatch(migration, /0067/);
});

test("authenticated users can read and request, but only service role can claim", () => {
  assert.match(migration, /grant select on public\.tennis_data_workers to authenticated/);
  assert.match(migration, /grant select on public\.tennis_data_jobs to authenticated/);
  assert.match(migration, /if auth\.uid\(\) is null then/);
  assert.match(
    migration,
    /revoke all on function public\.claim_tennis_data_job\(text, text, uuid\)[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.claim_tennis_data_job\(text, text, uuid\) to service_role/,
  );
});

test("queue prevents overlapping provider runs and supports Eastern daily catch-up", () => {
  assert.match(migration, /where status in \('queued', 'running'\)/);
  assert.match(migration, /for update skip locked/);
  assert.match(migration, /time zone 'America\/New_York'/);
  assert.match(migration, /time '07:00'/);
  assert.match(migration, /auth_status not in \('reauth_required', 'not_configured'\)/);
});

test("all security-definer functions pin search_path", () => {
  assert.equal((migration.match(/security definer/g) ?? []).length, 2);
  assert.equal((migration.match(/set search_path = public/g) ?? []).length, 2);
});
