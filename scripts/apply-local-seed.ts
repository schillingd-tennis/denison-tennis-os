/**
 * BP-022E / BP-026B — Apply People seed SQL to the running local database.
 *
 * Default (`npm run db:seed`): fill missing values only — never overwrites
 * existing Supabase fields.
 *
 * Force (`npm run db:seed:force-refresh`): hard-replaces provider-import
 * columns from the snapshot. App-authoritative fields (UTR, WTN, notes, …)
 * remain untouched.
 *
 * Does NOT drop the database.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const FORCE_FLAG = "--force-refresh";

function dockerPathEnv(): NodeJS.ProcessEnv {
  const home = process.env.HOME ?? "";
  const dockerBin = `${home}/Applications/Docker.app/Contents/Resources/bin`;
  const path = process.env.PATH ?? "";
  return {
    ...process.env,
    PATH: path.includes(dockerBin) ? path : `${dockerBin}:${path}`,
  };
}

function assertLocalUrl(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const local =
    url.includes("127.0.0.1") || url.includes("localhost") || url.includes("kong:8000");
  if (!local) {
    console.error(
      "Refusing to apply seed: NEXT_PUBLIC_SUPABASE_URL is not a local Supabase URL.",
    );
    console.error(`Current: ${url || "(unset)"}`);
    process.exit(1);
  }
}

function main(): void {
  assertLocalUrl();

  const forceRefresh = process.argv.includes(FORCE_FLAG);
  const fileName = forceRefresh ? "seed-force-refresh.sql" : "seed.sql";
  const seedPath = resolve(process.cwd(), "supabase", fileName);
  const sql = readFileSync(seedPath, "utf-8");
  const container = "supabase_db_denison-tennis-os";

  try {
    execFileSync(
      "docker",
      ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-f", "-"],
      {
        encoding: "utf-8",
        env: dockerPathEnv(),
        input: sql,
        stdio: ["pipe", "inherit", "inherit"],
        cwd: process.cwd(),
      },
    );
    if (forceRefresh) {
      console.log(
        "Applied supabase/seed-force-refresh.sql (provider-import columns hard-replaced).",
      );
      console.log("App-authoritative fields (UTR, WTN, notes, …) were not overwritten.");
    } else {
      console.log(
        "Applied supabase/seed.sql (fill missing values only — existing Supabase data preserved).",
      );
    }
  } catch {
    console.error(`Failed to apply ${fileName} via docker exec on container "${container}".`);
    console.error("Is local Supabase running? Try: npm run db:start");
    console.error("Regenerate seeds first if missing: npm run db:generate-seed");
    process.exit(1);
  }
}

main();
