import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = readFileSync(path.join(root, "supabase/migrations/0076_automation_health.sql"), "utf8");
const watchdog = readFileSync(path.join(root, "local-agents/utr-results-agent/src/automationWatchdog.ts"), "utf8");
const dashboard = readFileSync(path.join(root, "src/features/automationHealth/components/AutomationHealthDashboard.tsx"), "utf8");

test("automation health stores alerts and evaluates stale workers and jobs", () => {
  assert.match(migration, /create table public\.automation_alerts/);
  assert.match(migration, /heartbeat_at < now\(\) - interval '2 minutes'/);
  assert.match(migration, /status = 'queued'.*interval '5 minutes'/s);
  assert.match(migration, /status = 'running'.*interval '3 minutes'/s);
});

test("the Mac service evaluates automation health every minute", () => {
  assert.match(watchdog, /WATCHDOG_INTERVAL_MS = 60_000/);
  assert.match(watchdog, /evaluate_automation_health/);
  assert.match(watchdog, /sendMacNotification/);
  assert.match(watchdog, /notified_at/);
});

test("automation dashboard shows worker status, alerts, and durable job history", () => {
  assert.match(dashboard, /Workers online/);
  assert.match(dashboard, /Open alerts/);
  assert.match(dashboard, /Recent jobs/);
  assert.match(dashboard, /Auto-refreshes every 15 seconds/);
});
