import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";

test("0028 apple_messages_sync_jobs migration defines queue, leases, RLS, and no message body", () => {
  const sqlPath = path.join(process.cwd(), "supabase/migrations/0028_apple_messages_sync_jobs.sql");
  const sql = readFileSync(sqlPath, "utf8");

  assert.match(sql, /create table if not exists public\.apple_messages_sync_jobs/);
  assert.match(sql, /trigger in \('manual', 'scheduled', 'catch_up'\)/);
  assert.match(sql, /status in \('queued', 'running', 'completed', 'failed'\)/);
  assert.match(sql, /requested_at timestamptz/);
  assert.match(sql, /started_at timestamptz/);
  assert.match(sql, /heartbeat_at timestamptz/);
  assert.match(sql, /lease_expires_at timestamptz/);
  assert.match(sql, /finished_at timestamptz/);
  assert.match(sql, /imported_count integer/);
  assert.match(sql, /error_code text/);
  assert.match(sql, /apple_messages_sync_jobs_one_active/);
  assert.match(sql, /where status in \('queued', 'running'\)/);
  assert.match(sql, /apple_messages_sync_jobs_completed_finished_idx/);
  assert.match(sql, /where status = 'completed'/);

  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select/);
  assert.match(sql, /to authenticated/);
  assert.match(sql, /trigger = 'manual'/);
  assert.match(sql, /status = 'queued'/);
  assert.match(sql, /requested_by = auth\.uid\(\)/);
  assert.match(sql, /grant select, insert on table public\.apple_messages_sync_jobs to authenticated/);
  assert.match(sql, /grant all on table public\.apple_messages_sync_jobs to postgres, service_role/);
  assert.match(sql, /revoke all on table public\.apple_messages_sync_jobs from anon/);

  assert.doesNotMatch(sql, /for update/);
  assert.doesNotMatch(sql, /for delete/);
  assert.doesNotMatch(sql, /\bnotes\b/);
  assert.doesNotMatch(sql, /\bbody\b/);
  assert.doesNotMatch(sql, /attributedBody/);
  assert.doesNotMatch(sql, /message_text/);
  assert.match(sql, /Do not persist Apple message content/);
});
