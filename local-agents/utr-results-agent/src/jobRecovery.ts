import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Release jobs whose worker lease expired. Without this cleanup, the active-job
 * unique index can permanently block every later request for the provider.
 */
export async function recoverExpiredProviderJobs(
  client: SupabaseClient,
  provider: "utr" | "wtn" | "trn",
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("tennis_data_jobs")
    .update({
      status: "error",
      error: "The previous worker stopped before this job finished. It was released automatically; request the check again.",
      finished_at: now,
      lease_until: null,
      lease_token: null,
      updated_at: now,
    })
    .eq("provider", provider)
    .eq("status", "running")
    .lt("lease_until", now)
    .select("id");
  if (error) throw new Error(`Could not recover expired ${provider.toUpperCase()} jobs: ${error.message}`);
  return data?.length ?? 0;
}
