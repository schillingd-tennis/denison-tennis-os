import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AutomationAlert, AutomationHealthSnapshot, AutomationJob, AutomationWorker } from "./types";

export async function getAutomationHealthSnapshot(): Promise<AutomationHealthSnapshot> {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  await db.rpc("evaluate_automation_health");
  const [workersResult, jobsResult, alertsResult] = await Promise.all([
    db.from("tennis_data_workers")
      .select("provider, worker_id, heartbeat_at, auth_status, last_error, last_started_at, last_finished_at, checked_count")
      .order("provider"),
    db.from("tennis_data_jobs")
      .select("id, provider, kind, scope, status, source, requested_at, started_at, finished_at, updated_at, checked_count, total_count, error")
      .order("requested_at", { ascending: false }).limit(30),
    db.from("automation_alerts")
      .select("id, severity, code, provider, job_id, message, first_seen_at, last_seen_at")
      .is("resolved_at", null).order("last_seen_at", { ascending: false }),
  ]);
  if (workersResult.error) throw new Error(`Could not load automation workers: ${workersResult.error.message}`);
  if (jobsResult.error) throw new Error(`Could not load automation jobs: ${jobsResult.error.message}`);
  if (alertsResult.error) throw new Error(`Could not load automation alerts: ${alertsResult.error.message}`);

  return {
    workers: (workersResult.data ?? []).map((row) => ({
      provider: row.provider,
      workerId: row.worker_id,
      heartbeatAt: row.heartbeat_at,
      authStatus: row.auth_status,
      lastError: row.last_error?.slice(0, 500) ?? null,
      lastStartedAt: row.last_started_at,
      lastFinishedAt: row.last_finished_at,
      checkedCount: row.checked_count,
    })) as AutomationWorker[],
    jobs: (jobsResult.data ?? []).map((row) => ({
      id: row.id,
      provider: row.provider,
      kind: row.kind,
      scope: row.scope,
      status: row.status,
      source: row.source,
      requestedAt: row.requested_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      updatedAt: row.updated_at,
      checkedCount: row.checked_count,
      totalCount: row.total_count,
      error: row.error,
    })) as AutomationJob[],
    alerts: (alertsResult.data ?? []).map((row) => ({
      id: row.id,
      severity: row.severity,
      code: row.code,
      provider: row.provider,
      jobId: row.job_id,
      message: row.message,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
    })) as AutomationAlert[],
    collectedAt: new Date().toISOString(),
  };
}
