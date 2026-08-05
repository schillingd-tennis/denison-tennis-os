"use server";

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

/** Full local reset: migrations + seed.sql */
export async function resetLocalDatabaseAction(): Promise<DeveloperActionResult> {
  const blocked = assertLocalDev();
  if (blocked) return blocked;
  return runSupabase(["db", "reset", "--yes"]);
}

/** Re-apply seed.sql to the local database without dropping schema. */
export async function rerunSeedAction(): Promise<DeveloperActionResult> {
  const blocked = assertLocalDev();
  if (blocked) return blocked;

  const seedPath = resolve(process.cwd(), "supabase/seed.sql");
  const sql = readFileSync(seedPath, "utf-8");

  try {
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_denison-tennis-os",
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        "-",
      ],
      {
        encoding: "utf-8",
        env: dockerPathEnv(),
        input: sql,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000,
        cwd: process.cwd(),
      },
    );
    return { success: true, message: "Seed.sql applied to local database." };
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    const reset = runSupabase(["db", "reset", "--yes"]);
    if (reset.success) {
      return {
        success: true,
        message: `Direct seed failed; completed via db reset instead. (${(err.stderr ?? err.message ?? "error").slice(0, 120)})`,
      };
    }
    return {
      success: false,
      error: (err.stderr ?? err.message ?? reset.error ?? "Seed failed").trim().slice(0, 800),
    };
  }
}
