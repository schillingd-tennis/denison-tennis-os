/**
 * BP-022E — Apply `supabase/seed.sql` to the running local database.
 *
 * Does NOT drop the database. Upserts provider-synced fields only
 * (see generated seed + fieldOwnership / SYSTEM_OF_RECORD). Application-owned
 * values persist.
 *
 * Usage: `npm run db:seed`
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

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

  const seedPath = resolve(process.cwd(), "supabase/seed.sql");
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
      "Applied supabase/seed.sql to local database (provider-synced columns only on conflict).",
    );
    console.log("Application-owned fields (UTR, WTN, notes, …) were preserved.");
  } catch {
    console.error(`Failed to apply seed via docker exec on container "${container}".`);
    console.error("Is local Supabase running? Try: npm run db:start");
    process.exit(1);
  }
}

main();
