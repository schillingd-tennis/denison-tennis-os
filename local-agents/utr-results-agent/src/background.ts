import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { homedir } from "node:os";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createProductionSupabaseClient } from "../../../src/features/interactions/appleMessagesSync/liveRuntime";
import {
  buildUtrAgentRecruitRequests,
  finalizeIncrementalUtrAgentBatch,
  importSingleUtrAgentRecruitResult,
  type UtrAgentRecruitRunRow,
} from "../../../src/features/recruiting/todayBeta/utrAgentRun";
import { workerSupabaseScope } from "../../../src/lib/supabase/workerScope";
import {
  easternDay,
  UTR_WORKER_HEARTBEAT_INTERVAL_MS,
  UTR_WORKER_POLL_INTERVAL_MS,
  utrWorkerLeaseUntil,
} from "./backgroundSchedule.js";
import { isAgentBusy } from "./browser.js";
import { runRecruitChecks } from "./runCheck.js";

const HELPER_HOME = join(homedir(), "Library/Application Support/DenisonTennisOS");
const PROVIDER = "utr";
const WORKER_ID = `mac:${hostname()}`;

type WorkerPatch = {
  heartbeat_at?: string;
  auth_status?: "unknown" | "valid" | "reauth_required" | "not_configured" | "error";
  last_error?: string | null;
  last_finished_at?: string;
  completed_day?: string;
  checked_count?: number;
};

type JobPatch = {
  lease_until?: string | null;
  lease_token?: string | null;
  status?: "running" | "complete" | "partial" | "auth_required" | "error";
  finished_at?: string;
  checked_count?: number;
  total_count?: number;
  error?: string | null;
  updated_at?: string;
};

export function startBackgroundWorker(options?: { client?: SupabaseClient }): () => void {
  const client = options?.client ?? createProductionSupabaseClient(HELPER_HOME);
  let ticking = false;
  let jobId: string | null = null;
  let leaseToken: string | null = null;
  let lastHeartbeatOk = true;

  async function updateWorker(patch: WorkerPatch): Promise<void> {
    const { error } = await client.from("tennis_data_workers").upsert({
      provider: PROVIDER,
      worker_id: WORKER_ID,
      updated_at: new Date().toISOString(),
      ...patch,
    });
    if (error) throw new Error(error.message);
  }

  async function updateJob(patch: JobPatch): Promise<void> {
    if (!jobId || !leaseToken) throw new Error("Acquisition job lease is missing.");
    const { data, error } = await client
      .from("tennis_data_jobs")
      .update({ updated_at: new Date().toISOString(), ...patch })
      .eq("id", jobId)
      .eq("lease_token", leaseToken)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("Acquisition job lease was lost.");
  }

  async function heartbeat(): Promise<void> {
    try {
      await updateWorker(
        {
          heartbeat_at: new Date().toISOString(),
          auth_status: "valid",
          last_error: null,
        },
      );
      if (jobId && leaseToken) await updateJob({ lease_until: utrWorkerLeaseUntil() });
      lastHeartbeatOk = true;
    } catch {
      lastHeartbeatOk = false;
      console.error("UTR worker heartbeat failed; check migration 0070 and database connectivity.");
    }
  }

  async function markFailed(message: string): Promise<void> {
    await updateWorker({ auth_status: "error", last_error: message }).catch(() => undefined);
    if (!jobId || !leaseToken) return;
    await updateJob({
      status: "error",
      error: message,
      finished_at: new Date().toISOString(),
      lease_until: null,
      lease_token: null,
    }).catch(() => undefined);
  }

  async function tick(): Promise<void> {
    if (ticking || isAgentBusy()) return;
    ticking = true;

    try {
      await heartbeat();
      if (!lastHeartbeatOk) return;

      const nextToken = randomUUID();
      const { data, error } = await client.rpc("claim_tennis_data_job", {
        p_provider: PROVIDER,
        p_worker_id: WORKER_ID,
        p_token: nextToken,
      });
      if (error) throw new Error(error.message);
      if (!data) return;

      leaseToken = nextToken;
      jobId = String(data);
      await workerSupabaseScope.run(client, async () => {
        const startedAt = new Date().toISOString();
        const recruits = await buildUtrAgentRecruitRequests();
        const rows: UtrAgentRecruitRunRow[] = [];
        let stopReason: string | undefined;
        await updateJob({ total_count: recruits.length });

        for (const recruit of recruits) {
          if (!lastHeartbeatOk) throw new Error("Database connection lost during UTR check.");
          await updateJob({ lease_until: utrWorkerLeaseUntil() });

          const result = await runRecruitChecks({ mode: "all", recruits: [recruit] });
          const imported = await importSingleUtrAgentRecruitResult({
            agentResult: result,
            recruitRequest: recruit,
          });
          rows.push(imported.recruitRow);
          await updateJob({ checked_count: rows.length });
          await updateWorker({ checked_count: rows.length });

          if (imported.authRequired) {
            stopReason =
              "UTR login expired. Run npm run utr:login on the Mac, then request a new check.";
            break;
          }
        }

        const summary = await finalizeIncrementalUtrAgentBatch({
          runId: `background-${leaseToken}`,
          startedAt,
          finishedAt: new Date().toISOString(),
          stoppedEarly: Boolean(stopReason),
          stopReason,
          recruitRows: rows,
          cohortSize: recruits.length,
          configured: recruits.length,
        });
        const failed = Boolean(stopReason) || summary.totals.failed > 0;

        const finishedAt = new Date().toISOString();
        await updateJob({
          status: stopReason ? "auth_required" : failed ? "partial" : "complete",
          finished_at: finishedAt,
          error: stopReason ?? (failed ? "Some recruit checks failed." : null),
          lease_until: null,
          lease_token: null,
        });
        await updateWorker({
          auth_status: stopReason ? "reauth_required" : "valid",
          last_error: stopReason ?? (failed ? "Some recruit checks failed." : null),
          last_finished_at: finishedAt,
          ...(!failed ? { completed_day: easternDay() } : {}),
        });

        console.log(
          `UTR background check finished: ${rows.length} checked, ${summary.totals.savedAsNew} new, ${summary.totals.failed} failed.`,
        );
      });
    } catch {
      console.error("UTR background check failed; inspect worker status and local service logs.");
      await markFailed("Background check failed. Check Mac agent logs and UTR login; retry in one hour.");
    } finally {
      jobId = null;
      leaseToken = null;
      ticking = false;
    }
  }

  void tick();
  const pollTimer = setInterval(() => void tick(), UTR_WORKER_POLL_INTERVAL_MS);
  const heartbeatTimer = setInterval(
    () => void heartbeat(),
    UTR_WORKER_HEARTBEAT_INTERVAL_MS,
  );

  return () => {
    clearInterval(pollTimer);
    clearInterval(heartbeatTimer);
  };
}
