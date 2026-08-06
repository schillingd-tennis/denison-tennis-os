/**
 * BP-022E / BP-026B / BP-029A — Apply People seed SQL to the local database.
 *
 * Default (`npm run db:seed`): fill missing values only — never overwrites
 * existing Supabase fields.
 *
 * `--force-refresh` is **disabled** (BP-029A). Airtable must not hard-replace
 * populated SoR fields. Use `db:seed` for bootstrap fill-null only.
 *
 * Does NOT drop the database.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadEnvConfig } from "@next/env";

import { FORCE_REFRESH_DISABLED_MESSAGE } from "./fieldOwnership";

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

  if (process.argv.includes(FORCE_FLAG)) {
    console.error(FORCE_REFRESH_DISABLED_MESSAGE);
    process.exit(1);
  }

  const fileName = "seed.sql";
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
    console.log(
      "Applied supabase/seed.sql (fill missing values only — existing Supabase data preserved).",
    );
  } catch {
    console.error(`Failed to apply ${fileName} via docker exec on container "${container}".`);
    console.error("Is local Supabase running? Try: npm run db:start");
    console.error("Regenerate seeds first if missing: npm run db:generate-seed");
    process.exit(1);
  }
}

main();
