import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { homedir } from "node:os";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createProductionSupabaseClient } from "../../../src/features/interactions/appleMessagesSync/liveRuntime";
import {
  buildUtrAgentRecruitRequests,
  finalizeIncrementalUtrAgentBatch,
  importSingleUtrAgentRecruitResult,
  type UtrAgentRecruitRunRow,
} from "../../../src/features/recruiting/todayBeta/utrAgentRun";
import {
  listCurrentTeamRatingPlayers,
  recordTeamPower6Observation,
  recordTeamRatingObservation,
} from "../../../src/features/teamRatings/repository";
import {
  listEliteRecruitRatingPlayers,
  recordRecruitRatingObservation,
} from "../../../src/features/recruitRatings/repository";
import { workerSupabaseScope } from "../../../src/lib/supabase/workerScope";
import {
  easternDay,
  UTR_WORKER_HEARTBEAT_INTERVAL_MS,
  UTR_WORKER_POLL_INTERVAL_MS,
  utrWorkerLeaseUntil,
} from "./backgroundSchedule.js";
import { isAgentBusy } from "./browser.js";
import { runRecruitChecks } from "./runCheck.js";
import { runTeamUtrRatingChecks } from "./runTeamRatings.js";
import { DENISON_UTR_TEAM_URL } from "./checkTeamPower6.js";
import { recoverExpiredProviderJobs } from "./jobRecovery.js";

const HELPER_HOME = join(homedir(), "Library/Application Support/DenisonTennisOS");
const PROVIDER = "utr";
const WORKER_ID = `mac:${hostname()}`;

function createWorkerSupabaseClient(): SupabaseClient {
  const localUrl = process.env.UTR_AGENT_LOCAL_SUPABASE_URL;
  const localServiceRole = process.env.UTR_AGENT_LOCAL_SERVICE_ROLE_KEY;
  if (localUrl || localServiceRole) {
    if (!localUrl || !localServiceRole) throw new Error("local_supabase_config_incomplete");
    const parsed = new URL(localUrl);
    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      throw new Error("local_supabase_url_must_be_loopback");
    }
    return createClient(localUrl, localServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return createProductionSupabaseClient(HELPER_HOME);
}

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
  const client = options?.client ?? createWorkerSupabaseClient();
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
      const recovered = await recoverExpiredProviderJobs(client, PROVIDER);
      if (recovered) console.warn(`Released ${recovered} expired UTR job(s).`);
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
        const { data: claimedJob, error: jobError } = await client
          .from("tennis_data_jobs")
          .select("kind, scope")
          .eq("id", jobId)
          .single();
        if (jobError || !claimedJob) throw new Error("Claimed acquisition job could not be loaded.");

        if (claimedJob.kind === "rating" && claimedJob.scope === "team") {
          const players = await listCurrentTeamRatingPlayers("utr");
          await updateJob({ total_count: players.length });
          const run = await runTeamUtrRatingChecks(players);
          if (run.power6.status === "ok" && run.power6.rating != null) {
            await recordTeamPower6Observation({
              rating: run.power6.rating,
              ratingDate: run.ratingDate,
              sourceUrl: DENISON_UTR_TEAM_URL,
              diagnostic: run.power6.diagnostic,
            }, jobId!);
          } else {
            console.error(`Denison Power 6: ${run.power6.diagnostic ?? "rating_check_failed"}`);
          }
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
              console.error(`${row.player.displayName}: ${row.diagnostic ?? "rating_check_failed"}`);
            } else {
              await recordTeamRatingObservation({
                ...row.player,
                rating: row.rating,
                ratingDate: run.ratingDate,
                diagnostic: row.diagnostic,
              }, jobId!);
              saved += 1;
            }
            await updateJob({ checked_count: saved + failed });
            await updateWorker({ checked_count: saved + failed });
          }

          const finishedAt = new Date().toISOString();
          const message = authRequired
            ? "UTR login expired. Run npm run utr:login on the Mac, then request a new check."
            : failed ? `${failed} team rating check(s) failed.` : null;
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
          console.log(`Weekly team UTR ratings finished: ${saved} saved, ${failed} failed.`);
          return;
        }

        if (claimedJob.kind === "rating" && claimedJob.scope === "recruits") {
          const recruits = await listEliteRecruitRatingPlayers("utr");
          await updateJob({ total_count: recruits.length });
          const run = await runTeamUtrRatingChecks(recruits.map((row) => ({
            personId: row.personId,
            displayName: row.displayName,
            provider: "utr" as const,
            externalPlayerId: row.externalPlayerId,
            profileUrl: row.profileUrl,
          })));
          let saved = 0;
          let failed = 0;
          let authRequired = false;
          for (const row of run.rows) {
            const recruit = recruits.find((entry) => entry.personId === row.player.personId);
            if (row.status === "auth_required") {
              authRequired = true;
              failed += 1;
              break;
            }
            if (!recruit || row.status !== "ok" || row.rating == null) {
              failed += 1;
              console.error(`${row.player.displayName}: ${row.diagnostic ?? "UTR_RATING_FAILED"}`);
            } else {
              await recordRecruitRatingObservation({
                ...recruit,
                rating: row.rating,
                ratingDate: run.ratingDate,
                diagnostic: row.diagnostic,
              }, jobId!);
              saved += 1;
            }
            await updateJob({ checked_count: saved + failed });
            await updateWorker({ checked_count: saved + failed });
          }
          const finishedAt = new Date().toISOString();
          const message = authRequired
            ? "UTR login expired. Run npm run utr:login on the Mac, then request a new check."
            : failed ? `${failed} elite recruit UTR check(s) failed.` : null;
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
          console.log(`Weekly elite recruit UTR ratings finished: ${saved} saved, ${failed} failed.`);
          return;
        }

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
    } catch (error) {
      const diagnostic = error instanceof Error ? error.message : "unknown_error";
      console.error(`UTR background check failed: ${diagnostic}`);
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
