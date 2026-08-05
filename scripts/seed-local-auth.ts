/**
 * Seed the default local development auth user via the Supabase Auth Admin
 * API (GoTrue). Never runs against a hosted project.
 *
 * Idempotent: creates the user or resets their password if they already exist.
 * Intended to run after `db:start` / `db:reset`.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const LOCAL_URL_PATTERN = /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i;

/** Development-only credentials — never use in hosted/production. */
const LOCAL_DEV_EMAIL = "schillingd@denison.edu";
const LOCAL_DEV_PASSWORD = "ChangeMe123!";

function dockerPathEnv(): NodeJS.ProcessEnv {
  const home = process.env.HOME ?? "";
  const dockerBin = `${home}/Applications/Docker.app/Contents/Resources/bin`;
  const path = process.env.PATH ?? "";
  return {
    ...process.env,
    PATH: path.includes(dockerBin) ? path : `${dockerBin}:${path}`,
  };
}

function readLocalSupabaseEnv(): { apiUrl: string; serviceRoleKey: string } {
  const supabaseBin = resolve(process.cwd(), "node_modules/.bin/supabase");
  let output: string;
  try {
    output = execFileSync(supabaseBin, ["status", "-o", "env"], {
      encoding: "utf-8",
      env: dockerPathEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    console.error("Local Supabase is not running.");
    console.error("Start it first: npm run db:start");
    process.exit(1);
  }

  const env: Record<string, string> = {};
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  const apiUrl = env.API_URL ?? env.SUPABASE_URL;
  const serviceRoleKey = env.SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiUrl || !serviceRoleKey) {
    console.error("Could not read API_URL / SERVICE_ROLE_KEY from supabase status.");
    process.exit(1);
  }

  return { apiUrl, serviceRoleKey };
}

async function main(): Promise<void> {
  const { apiUrl, serviceRoleKey } = readLocalSupabaseEnv();

  if (!LOCAL_URL_PATTERN.test(apiUrl)) {
    console.error(`Refusing to seed auth: API URL is not local (${apiUrl}).`);
    console.error("This script is for local development only.");
    process.exit(1);
  }

  const admin = createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    console.error("Failed to list auth users:", listError.message);
    process.exit(1);
  }

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === LOCAL_DEV_EMAIL.toLowerCase(),
  );

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: LOCAL_DEV_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("Failed to update local auth user:", error.message);
      process.exit(1);
    }
    console.log(`Updated local auth user: ${LOCAL_DEV_EMAIL}`);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: LOCAL_DEV_EMAIL,
      password: LOCAL_DEV_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("Failed to create local auth user:", error.message);
      process.exit(1);
    }
    console.log(`Created local auth user: ${LOCAL_DEV_EMAIL}`);
  }

  console.log("");
  console.log("Local development login (never use on hosted/production):");
  console.log(`  Email:    ${LOCAL_DEV_EMAIL}`);
  console.log(`  Password: ${LOCAL_DEV_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
