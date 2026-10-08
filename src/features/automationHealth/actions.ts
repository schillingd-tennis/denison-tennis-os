"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function resolveAutomationAlertAction(alertId: string): Promise<void> {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  const { error } = await db.rpc("resolve_automation_alert", { p_alert_id: alertId });
  if (error) throw new Error(`Could not resolve alert: ${error.message}`);
  revalidatePath("/settings/automation");
}
