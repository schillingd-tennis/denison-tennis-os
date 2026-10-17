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
import { getTrnContext } from "./trnBrowser.js";
import { findPublicTrnProfile } from "./trnPublicProfile.js";

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
        const { data: job, error: jobError } = await client.from("tennis_data_jobs").select("kind, scope, target_id").eq("id", jobId).single();
        if (jobError || !job) throw new Error("TRN acquisition job could not be loaded.");
        if (job.kind === "profile" && job.scope === "tournament" && job.target_id) {
          const { data: participants, error: participantError } = await client.from("recruiting_tournament_participants")
            .select("id,participant_name,recruit_person_id,trn_url,trn_rank").eq("tournament_id", job.target_id);
          if (participantError) throw new Error(participantError.message);
          const rows = (participants ?? []) as Array<{ id: string; participant_name: string; recruit_person_id: string | null; trn_url: string | null; trn_rank: number | null }>;
          const personIds = [...new Set(rows.flatMap((row) => row.recruit_person_id ? [row.recruit_person_id] : []))];
          const { data: people, error: peopleError } = personIds.length
            ? await client.from("production_people").select("id,trn_url,trn_rank").in("id", personIds)
            : { data: [], error: null };
          if (peopleError) throw new Error(peopleError.message);
          const existing = new Map((people ?? []).map((person) => [String(person.id), person]));
          const pending = rows.filter((row) => {
            if (row.trn_url || row.trn_rank) return false;
            if (!row.recruit_person_id) return true;
            const person = existing.get(row.recruit_person_id);
            return !person?.trn_url && !person?.trn_rank;
          });
          await updateJob({ total_count: pending.length });
          const context = await getTrnContext();
          let saved = 0; let failed = 0; let verificationRequired = false;
          for (const row of pending) {
            try {
              const profile = await findPublicTrnProfile(context, row.participant_name);
              if (!profile) { failed += 1; }
              else {
                const patch: Record<string, unknown> = { trn_url: profile.profileUrl };
                if (profile.city) patch.city = profile.city; if (profile.state) patch.state = profile.state;
                if (profile.rank) patch.trn_rank = profile.rank; if (profile.starRating) patch.trn_star_rating = profile.starRating;
                const { error: participantUpdateError } = await client.from("recruiting_tournament_participants").update({
                  trn_url: profile.profileUrl, trn_rank: profile.rank, trn_star_rating: profile.starRating,
                  class_year: profile.classYear, city: profile.city ?? undefined, state: profile.state ?? undefined,
                }).eq("id", row.id);
                if (participantUpdateError) throw new Error(participantUpdateError.message);
                if (row.recruit_person_id) {
                  const { error: updateError } = await client.from("production_people").update(patch).eq("id", row.recruit_person_id);
                  if (updateError) throw new Error(updateError.message);
                  if (profile.classYear) await client.from("recruit_profiles").update({ recruit_class_year: profile.classYear }).eq("person_id", row.recruit_person_id);
                }
                saved += 1;
              }
            } catch (error) {
              failed += 1;
              if (error instanceof Error && error.message === "TRN_BROWSER_VERIFICATION_REQUIRED") { verificationRequired = true; break; }
              console.error(`${row.participant_name}: ${error instanceof Error ? error.message : "TRN profile lookup failed"}`);
            }
            await updateJob({ checked_count: saved + failed }); await updateWorker({ checked_count: saved + failed });
          }
          const finishedAt = new Date().toISOString();
          const message = verificationRequired ? "TennisRecruiting.net browser verification required. Run npm run trn:login on the Mac, complete the browser check, then retry." : failed ? `${failed} public TRN profile(s) need manual review.` : null;
          await updateJob({ status: verificationRequired ? "auth_required" : failed ? "partial" : "complete", finished_at: finishedAt, checked_count: saved + failed, error: message, lease_until: null, lease_token: null });
          await updateWorker({ auth_status: verificationRequired ? "reauth_required" : "valid", last_error: message, last_finished_at: finishedAt, checked_count: saved + failed });
          console.log(`Tournament TRN enrichment finished: ${saved} saved, ${failed} unresolved.`);
          return;
        }
        if (job.kind !== "rating" || job.scope !== "recruits") throw new Error("Unsupported TRN acquisition job.");
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
