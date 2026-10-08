import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createProductionSupabaseClient } from "../../../src/features/interactions/appleMessagesSync/liveRuntime";

const HELPER_HOME = join(homedir(), "Library/Application Support/DenisonTennisOS");
const WATCHDOG_INTERVAL_MS = 60_000;
const execFileAsync = promisify(execFile);

async function sendMacNotification(message: string): Promise<void> {
  const script = "on run argv\n display notification (item 1 of argv) with title \"Denison Tennis OS\" subtitle \"Automation needs attention\"\nend run";
  await execFileAsync("/usr/bin/osascript", ["-e", script, message.slice(0, 220)]);
}

function createWatchdogClient(): SupabaseClient {
  const localUrl = process.env.UTR_AGENT_LOCAL_SUPABASE_URL;
  const localKey = process.env.UTR_AGENT_LOCAL_SERVICE_ROLE_KEY;
  if (localUrl || localKey) {
    if (!localUrl || !localKey) throw new Error("local_supabase_config_incomplete");
    return createClient(localUrl, localKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return createProductionSupabaseClient(HELPER_HOME);
}

export function startAutomationWatchdog(options?: { client?: SupabaseClient }): () => void {
  const client = options?.client ?? createWatchdogClient();
  let evaluating = false;
  async function evaluate(): Promise<void> {
    if (evaluating) return;
    evaluating = true;
    try {
      const { error } = await client.rpc("evaluate_automation_health");
      if (error && !["PGRST202", "42883"].includes(error.code ?? "")) {
        console.error(`Automation watchdog failed: ${error.message}`);
        return;
      }
      if (error) return;
      const { data: alerts, error: alertsError } = await client.from("automation_alerts")
        .select("id, message")
        .eq("severity", "critical")
        .is("resolved_at", null)
        .is("notified_at", null)
        .order("first_seen_at")
        .limit(5);
      if (alertsError) return;
      for (const alert of alerts ?? []) {
        try {
          await sendMacNotification(alert.message);
          await client.from("automation_alerts").update({ notified_at: new Date().toISOString() }).eq("id", alert.id);
        } catch (notificationError) {
          console.error(`Automation notification failed: ${notificationError instanceof Error ? notificationError.message : "unknown error"}`);
          break;
        }
      }
    } finally {
      evaluating = false;
    }
  }
  void evaluate();
  const timer = setInterval(() => void evaluate(), WATCHDOG_INTERVAL_MS);
  return () => clearInterval(timer);
}
