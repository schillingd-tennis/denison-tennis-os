/**
 * BP-021B — Print local Supabase URL + anon key for `.env.local`.
 *
 * Run after `npm run db:start`. Copies nothing automatically — paste into
 * `.env.local` (or compare with the values `supabase status` prints).
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

function main(): void {
  const supabaseBin = resolve(process.cwd(), "node_modules/.bin/supabase");

  let output: string;
  try {
    output = execFileSync(supabaseBin, ["status", "-o", "env"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    console.error("Could not read local Supabase status.");
    console.error("Start the stack first: npm run db:start");
    console.error("(Docker Desktop must be running.)");
    if (error instanceof Error && "stderr" in error) {
      console.error(String((error as { stderr?: Buffer }).stderr ?? ""));
    }
    process.exitCode = 1;
    return;
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
  const anonKey = env.ANON_KEY ?? env.SUPABASE_ANON_KEY;

  if (!apiUrl || !anonKey) {
    console.error("supabase status -o env did not include API_URL / ANON_KEY.");
    console.error("Raw output:");
    console.error(output);
    process.exitCode = 1;
    return;
  }

  console.log("# Paste into .env.local for local development (BP-021B)");
  console.log(`NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`);
  console.log(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${anonKey}`);
  console.log("");
  console.log("# After updating .env.local, restart: npm run dev");
}

main();
