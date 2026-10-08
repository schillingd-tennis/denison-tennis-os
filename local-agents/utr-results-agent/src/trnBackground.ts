import { randomUUID } from "node:crypto";
import { hostname, homedir } from "node:os";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createProductionSupabaseClient } from "../../../src/features/interactions/appleMessagesSync/liveRuntime";
import { listEliteRecruitRatingPlayers, recordRecruitRatingObservation } from "../../../src/features/recruitRatings/repository";
import { workerSupabaseScope } from "../../../src/lib/supabase/workerScope";
import { UTR_WORKER_HEARTBEAT_INTERVAL_MS, UTR_WORKER_POLL_INTERVAL_MS, utrWorkerLeaseUntil } from "./backgroundSchedule.js";
import { runTrnRatingChecks } from "./runTrnRatings.js";
import { recoverExpiredProviderJobs } from "./jobRecovery.js";

const HELPER_HOME = join(homedir(), "Library/Application Support/DenisonTennisOS");
const PROVIDER = "trn";
const WORKER_ID = `mac:${hostname()}:trn`;

function createClientForWorker(): SupabaseClient {
  const localUrl = process.env.UTR_AGENT_LOCAL_SUPABASE_URL;
  const localKey = process.env.UTR_AGENT_LOCAL_SERVICE_ROLE_KEY;
  if (localUrl || localKey) {
    if (!localUrl || !localKey) throw new Error("local_supabase_config_incomplete");
    const parsed = new URL(localUrl);
    if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error("local_supabase_url_must_be_loopback");
    return createClient(localUrl, localKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return createProductionSupabaseClient(HELPER_HOME);
}

export function startTrnBackgroundWorker(options?: { client?: SupabaseClient }): () => void {
  const client = options?.client ?? createClientForWorker();
  let ticking = false;
  let jobId: string | null = null;
  let leaseToken: string | null = null;
  const updateWorker = async (patch: Record<string, unknown>) => {
    const { error } = await client.from("tennis_data_workers").upsert({ provider: PROVIDER, worker_id: WORKER_ID, updated_at: new Date().toISOString(), ...patch });
    if (error) throw new Error(error.message);
  };
  const updateJob = async (patch: Record<string, unknown>) => {
    if (!jobId || !leaseToken) throw new Error("TRN job lease is missing.");
    const { data, error } = await client.from("tennis_data_jobs").update({ updated_at: new Date().toISOString(), ...patch }).eq("id", jobId).eq("lease_token", leaseToken).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("TRN job lease was lost.");
  };
  const heartbeat = async () => {
    // A heartbeat proves the process is alive; it does not prove the saved
    // browser session is authenticated. Preserve auth/error state until a
    // completed check explicitly changes it.
    await updateWorker({ heartbeat_at: new Date().toISOString() });
    if (jobId && leaseToken) await updateJob({ lease_until: utrWorkerLeaseUntil() });
  };
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      const recovered = await recoverExpiredProviderJobs(client, PROVIDER);
      if (recovered) console.warn(`Released ${recovered} expired TRN job(s).`);
      await heartbeat();
      const token = randomUUID();
      const { data, error } = await client.rpc("claim_tennis_data_job", { p_provider: PROVIDER, p_worker_id: WORKER_ID, p_token: token });
      if (error) throw new Error(error.message);
      if (!data) return;
      jobId = String(data);
      leaseToken = token;
      await workerSupabaseScope.run(client, async () => {
        const { data: job, error: jobError } = await client.from("tennis_data_jobs").select("kind, scope").eq("id", jobId).single();
        if (jobError || !job || job.kind !== "rating" || job.scope !== "recruits") throw new Error("Unsupported TRN acquisition job.");
        const recruits = await listEliteRecruitRatingPlayers("trn");
        await updateJob({ total_count: recruits.length });
        const run = await runTrnRatingChecks(recruits);
        let saved = 0;
        let failed = 0;
        let authRequired = false;
        for (const row of run.rows) {
          if (row.status === "auth_required") { authRequired = true; failed += 1; break; }
          if (row.status !== "ok" || row.rank == null) {
            failed += 1;
            console.error(`${row.player.displayName}: ${row.diagnostic ?? "TRN_RATING_FAILED"}`);
          } else {
            await recordRecruitRatingObservation({ ...row.player, rating: row.rank, starRating: row.starRating, ratingDate: run.ratingDate, diagnostic: row.diagnostic }, jobId!);
            saved += 1;
          }
          await updateJob({ checked_count: saved + failed });
          await updateWorker({ checked_count: saved + failed });
        }
        const finishedAt = new Date().toISOString();
        const systemicFailure = run.systemicFailure;
        const message = authRequired
          ? "TennisRecruiting.net login required. Open Automation Health and reconnect TRN, then request a new check."
          : systemicFailure ?? (failed ? `${failed} TRN rating check(s) failed.` : null);
        await updateJob({ status: authRequired ? "auth_required" : systemicFailure ? "error" : failed ? "partial" : "complete", finished_at: finishedAt, checked_count: saved + failed, error: message, lease_until: null, lease_token: null });
        await updateWorker({ auth_status: authRequired ? "reauth_required" : systemicFailure ? "error" : "valid", last_error: message, last_finished_at: finishedAt, checked_count: saved + failed });
        console.log(`Weekly elite recruit TRN ratings finished: ${saved} saved, ${failed} failed.`);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "TRN background check failed.";
      console.error(`TRN background check failed: ${message}`);
      await updateWorker({ auth_status: "error", last_error: message }).catch(() => undefined);
      if (jobId && leaseToken) await updateJob({ status: "error", error: message, finished_at: new Date().toISOString(), lease_until: null, lease_token: null }).catch(() => undefined);
    } finally {
      jobId = null;
      leaseToken = null;
      ticking = false;
    }
  };
  void tick();
  const pollTimer = setInterval(() => void tick(), UTR_WORKER_POLL_INTERVAL_MS);
  const heartbeatTimer = setInterval(() => void heartbeat().catch(() => undefined), UTR_WORKER_HEARTBEAT_INTERVAL_MS);
  return () => { clearInterval(pollTimer); clearInterval(heartbeatTimer); };
}
