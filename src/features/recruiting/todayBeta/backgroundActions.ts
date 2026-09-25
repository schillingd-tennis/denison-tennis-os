"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AcquisitionProvider = "utr" | "trn" | "wtn";

export type AcquisitionProviderStatus = {
  provider: AcquisitionProvider;
  heartbeat_at: string | null;
  auth_status: "unknown" | "valid" | "reauth_required" | "not_configured" | "error";
  last_error: string | null;
  last_started_at: string | null;
  last_finished_at: string | null;
  completed_day: string | null;
  checked_count: number;
  job: {
    id: string;
    status: "queued" | "running" | "complete" | "partial" | "auth_required" | "error";
    requested_at: string;
    checked_count: number;
    total_count: number;
    error: string | null;
  } | null;
};

export async function getAcquisitionProviderStatus(
  provider: AcquisitionProvider,
): Promise<AcquisitionProviderStatus> {
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Sign in to view acquisition status.");

  const [{ data: worker, error: workerError }, { data: jobs, error: jobsError }] =
    await Promise.all([
      db
        .from("tennis_data_workers")
        .select(
          "provider, heartbeat_at, auth_status, last_error, last_started_at, last_finished_at, completed_day, checked_count",
        )
        .eq("provider", provider)
        .single(),
      db
        .from("tennis_data_jobs")
        .select("id, status, requested_at, checked_count, total_count, error")
        .eq("provider", provider)
        .order("requested_at", { ascending: false })
        .limit(1),
    ]);

  if (workerError || jobsError || !worker) {
    throw new Error("Acquisition control plane unavailable. Migration 0070 is not installed.");
  }
  return { ...(worker as Omit<AcquisitionProviderStatus, "job">), job: jobs?.[0] ?? null };
}

export async function queueAcquisitionJob(provider: AcquisitionProvider): Promise<void> {
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Sign in to request a check.");

  const { error } = await db.rpc("request_tennis_data_job", {
    p_provider: provider,
    p_kind: "results",
  });
  if (error) throw new Error("Could not queue the acquisition job. Please retry.");
}
