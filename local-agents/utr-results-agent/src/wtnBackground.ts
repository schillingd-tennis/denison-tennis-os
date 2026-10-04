import { randomUUID } from "node:crypto";
import { hostname, homedir } from "node:os";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createProductionSupabaseClient } from "../../../src/features/interactions/appleMessagesSync/liveRuntime";
import { listCurrentTeamRatingPlayers, recordTeamRatingObservation } from "../../../src/features/teamRatings/repository";
import { listEliteRecruitRatingPlayers, recordRecruitRatingObservation } from "../../../src/features/recruitRatings/repository";
import { workerSupabaseScope } from "../../../src/lib/supabase/workerScope";
import { UTR_WORKER_HEARTBEAT_INTERVAL_MS, UTR_WORKER_POLL_INTERVAL_MS, utrWorkerLeaseUntil } from "./backgroundSchedule.js";
import { runTeamWtnRatingChecks } from "./runWtnRatings.js";

const HELPER_HOME = join(homedir(), "Library/Application Support/DenisonTennisOS");
const PROVIDER = "wtn";
const WORKER_ID = `mac:${hostname()}:wtn`;

function createWtnWorkerClient(): SupabaseClient {
  const localUrl = process.env.UTR_AGENT_LOCAL_SUPABASE_URL;
  const localServiceRole = process.env.UTR_AGENT_LOCAL_SERVICE_ROLE_KEY;
  if (localUrl || localServiceRole) {
    if (!localUrl || !localServiceRole) throw new Error("local_supabase_config_incomplete");
    const parsed = new URL(localUrl);
    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      throw new Error("local_supabase_url_must_be_loopback");
    }
    return createClient(localUrl, localServiceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return createProductionSupabaseClient(HELPER_HOME);
}

export function startWtnBackgroundWorker(options?: { client?: SupabaseClient }): () => void {
  const client = options?.client ?? createWtnWorkerClient();
  let ticking = false;
  let jobId: string | null = null;
  let leaseToken: string | null = null;

  async function updateWorker(patch: Record<string, unknown>): Promise<void> {
    const { error } = await client.from("tennis_data_workers").upsert({
      provider: PROVIDER,
      worker_id: WORKER_ID,
      updated_at: new Date().toISOString(),
      ...patch,
    });
    if (error) throw new Error(error.message);
  }

  async function updateJob(patch: Record<string, unknown>): Promise<void> {
    if (!jobId || !leaseToken) throw new Error("WTN job lease is missing.");
    const { data, error } = await client.from("tennis_data_jobs")
      .update({ updated_at: new Date().toISOString(), ...patch })
      .eq("id", jobId).eq("lease_token", leaseToken).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("WTN job lease was lost.");
  }

  async function heartbeat(): Promise<void> {
    await updateWorker({ heartbeat_at: new Date().toISOString(), auth_status: "valid", last_error: null });
    if (jobId && leaseToken) await updateJob({ lease_until: utrWorkerLeaseUntil() });
  }

  async function tick(): Promise<void> {
    if (ticking) return;
    ticking = true;
    try {
      await heartbeat();
      const token = randomUUID();
      const { data, error } = await client.rpc("claim_tennis_data_job", {
        p_provider: PROVIDER,
        p_worker_id: WORKER_ID,
        p_token: token,
      });
      if (error) throw new Error(error.message);
      if (!data) return;
      jobId = String(data);
      leaseToken = token;

      await workerSupabaseScope.run(client, async () => {
        const { data: job, error: jobError } = await client.from("tennis_data_jobs")
          .select("kind, scope").eq("id", jobId).single();
        if (jobError || !job || job.kind !== "rating" || !["team", "recruits"].includes(job.scope)) {
          throw new Error("Unsupported WTN acquisition job.");
        }
        const recruits = job.scope === "recruits" ? await listEliteRecruitRatingPlayers("wtn") : null;
        const players = recruits?.map((row) => ({
          personId: row.personId,
          displayName: row.displayName,
          provider: "wtn" as const,
          externalPlayerId: row.externalPlayerId,
          profileUrl: row.profileUrl,
        })) ?? await listCurrentTeamRatingPlayers("wtn");
        await updateJob({ total_count: players.length });
        const run = await runTeamWtnRatingChecks(players);
        let saved = 0;
        let failed = 0;
        let authRequired = false;
        for (const row of run.rows) {
          if (row.status === "auth_required") {
            authRequired = true;
            failed += 1;
            break;
          }
          if (row.status !== "ok" || row.rating == null) {
            failed += 1;
            console.error(`${row.player.displayName}: ${row.diagnostic ?? "WTN_RATING_FAILED"}`);
          } else {
            const recruit = recruits?.find((entry) => entry.personId === row.player.personId);
            if (recruit) {
              await recordRecruitRatingObservation({ ...recruit, rating: row.rating, ratingDate: run.ratingDate, diagnostic: row.diagnostic }, jobId!);
            } else {
              await recordTeamRatingObservation({ ...row.player, rating: row.rating, ratingDate: run.ratingDate, diagnostic: row.diagnostic }, jobId!);
            }
            saved += 1;
          }
          await updateJob({ checked_count: saved + failed });
          await updateWorker({ checked_count: saved + failed });
        }
        const finishedAt = new Date().toISOString();
        const message = authRequired
          ? "WTN login expired. Run npm run wtn:login on the Mac, then request a new check."
          : failed ? `${failed} WTN rating check(s) failed.` : null;
        await updateJob({
          status: authRequired ? "auth_required" : failed ? "partial" : "complete",
          finished_at: finishedAt,
          checked_count: saved + failed,
          error: message,
          lease_until: null,
          lease_token: null,
        });
        await updateWorker({
          auth_status: authRequired ? "reauth_required" : "valid",
          last_error: message,
          last_finished_at: finishedAt,
          checked_count: saved + failed,
        });
        console.log(`Weekly ${job.scope === "recruits" ? "elite recruit" : "team"} WTN ratings finished: ${saved} saved, ${failed} failed.`);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "WTN background check failed.";
      console.error(`WTN background check failed: ${message}`);
      await updateWorker({ auth_status: "error", last_error: message }).catch(() => undefined);
      if (jobId && leaseToken) {
        await updateJob({ status: "error", error: message, finished_at: new Date().toISOString(), lease_until: null, lease_token: null }).catch(() => undefined);
      }
    } finally {
      jobId = null;
      leaseToken = null;
      ticking = false;
    }
  }

  void tick();
  const pollTimer = setInterval(() => void tick(), UTR_WORKER_POLL_INTERVAL_MS);
  const heartbeatTimer = setInterval(() => void heartbeat().catch(() => undefined), UTR_WORKER_HEARTBEAT_INTERVAL_MS);
  return () => { clearInterval(pollTimer); clearInterval(heartbeatTimer); };
}
