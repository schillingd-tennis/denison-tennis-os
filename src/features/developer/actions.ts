"use server";

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { detectEnvironment } from "./detectEnvironment";

export type DeveloperActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

function dockerPathEnv(): NodeJS.ProcessEnv {
  const home = process.env.HOME ?? "";
  const dockerBin = `${home}/Applications/Docker.app/Contents/Resources/bin`;
  const path = process.env.PATH ?? "";
  return {
    ...process.env,
    PATH: path.includes(dockerBin) ? path : `${dockerBin}:${path}`,
  };
}

function assertLocalDev(): DeveloperActionResult | null {
  if (process.env.NODE_ENV !== "development") {
    return { success: false, error: "Developer database actions are only available in development." };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (detectEnvironment(url) !== "local") {
    return {
      success: false,
      error: "Refusing to run: .env.local points at a hosted Supabase project. Switch to local first.",
    };
  }
  return null;
}

function runNpmScript(script: string): DeveloperActionResult {
  try {
    const stdout = execFileSync("npm", ["run", script], {
      encoding: "utf-8",
      env: dockerPathEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
      cwd: process.cwd(),
    });
    const tail = stdout.trim().split("\n").slice(-6).join("\n");
    return {
      success: true,
      message: tail || `Completed: npm run ${script}`,
    };
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    return {
      success: false,
      error: (err.stderr ?? err.message ?? "Command failed").trim().slice(0, 800),
    };
  }
}

function runSupabase(args: string[]): DeveloperActionResult {
  const supabaseBin = resolve(process.cwd(), "node_modules/.bin/supabase");
  try {
    const stdout = execFileSync(supabaseBin, args, {
      encoding: "utf-8",
      env: dockerPathEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
      cwd: process.cwd(),
    });
    const tail = stdout.trim().split("\n").slice(-4).join("\n");
    return {
      success: true,
      message: tail || `Completed: supabase ${args.join(" ")}`,
    };
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    return {
      success: false,
      error: (err.stderr ?? err.message ?? "Command failed").trim().slice(0, 800),
    };
  }
}

/**
 * DESTRUCTIVE — drops the local database, re-applies migrations + seed.sql,
 * then seeds the local auth user. All manual edits are lost.
 */
export async function resetLocalDatabaseAction(): Promise<DeveloperActionResult> {
  const blocked = assertLocalDev();
  if (blocked) return blocked;
  const reset = runSupabase(["db", "reset", "--yes"]);
  if (!reset.success) return reset;
  const auth = runNpmScript("db:seed-auth");
  if (!auth.success) {
    return {
      success: false,
      error: `Database reset succeeded but auth seed failed: ${auth.error}`,
    };
  }
  return {
    success: true,
    message: "Local database reset complete (migrations + seed + auth). All prior local data was destroyed.",
  };
}

/**
 * Re-apply seed.sql without dropping the database (BP-026B).
 * Fills missing (NULL) values only — never overwrites existing Supabase data.
 * Never falls back to db reset.
 */
export async function rerunSeedAction(): Promise<DeveloperActionResult> {
  const blocked = assertLocalDev();
  if (blocked) return blocked;
  return runNpmScript("db:seed");
}

/**
 * Force Refresh From Provider — hard-replaces provider-import columns from
 * the import snapshot. App-authoritative fields (UTR, WTN, notes, …) are
 * never overwritten. Explicit opt-in only (BP-026B).
 */
export async function forceRefreshFromProviderAction(): Promise<DeveloperActionResult> {
  const blocked = assertLocalDev();
  if (blocked) return blocked;
  return runNpmScript("db:seed:force-refresh");
}
