/**
 * BP-014 Phase 1 — Supabase Connection Check.
 *
 * A one-off diagnostic (not part of the app) that confirms:
 *   1. `.env.local` is being read correctly (URL + publishable key present
 *      and well-formed).
 *   2. The app can actually reach the Supabase project over the network
 *      using those values, via the shared `src/lib/supabase.ts` client.
 *
 * This does not touch any database table — none exist yet. It only hits
 * Supabase's GoTrue (auth) health endpoint, which requires no schema and
 * no API key, plus the PostgREST root endpoint, which requires a valid
 * `apikey` header but no tables.
 *
 * Usage: `npm run verify:supabase`
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  console.log("Checking .env.local values...");
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${url ?? "(missing)"}`);
  console.log(
    `  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${key ? `${key.slice(0, 14)}... (${key.length} chars)` : "(missing)"}`,
  );

  if (!url || !key) {
    console.error("\nOne or both environment variables are missing. Aborting.");
    process.exitCode = 1;
    return;
  }

  // Import after the env check so the descriptive error in supabase.ts
  // never masks the clearer messages above.
  const { supabase } = await import("../src/lib/supabase");
  console.log("\nsrc/lib/supabase.ts client created successfully.");

  console.log("\nChecking network connectivity to Supabase...");

  // 1. GoTrue health endpoint: no API key or schema required.
  const authHealthUrl = `${url}/auth/v1/health`;
  const authRes = await fetch(authHealthUrl);
  console.log(`  GET /auth/v1/health -> ${authRes.status} ${authRes.statusText}`);
  if (authRes.ok) {
    const body = await authRes.json();
    console.log(`    ${JSON.stringify(body)}`);
  }

  // 2. PostgREST root: validates the publishable key is accepted by the
  // project, without requiring any tables to exist.
  const { error } = await supabase.from("__bp014_connection_check__").select("*").limit(1);
  if (error && error.code === "PGRST205") {
    // "Could not find the table" — expected since no tables exist yet.
    // Reaching this point means the URL + key were valid enough for
    // PostgREST to parse the request and respond with a real API error.
    console.log(`  supabase-js query -> reached PostgREST, got expected "table not found" response.`);
    console.log(`    (${error.message})`);
  } else if (error) {
    console.log(`  supabase-js query -> unexpected error: [${error.code}] ${error.message}`);
  } else {
    console.log(`  supabase-js query -> unexpected success (table exists?)`);
  }

  console.log("\nConnection check complete.");
}

main().catch((err) => {
  console.error("\nConnection check failed:", err);
  process.exitCode = 1;
});
