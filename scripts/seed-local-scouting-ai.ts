import { execFileSync } from "node:child_process";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(?:\/|$)/.test(url)) {
  throw new Error(`Refusing to seed scouting fixtures into non-local Supabase URL: ${url}`);
}

execFileSync("npx", ["supabase", "db", "query", "--local", "--file", "supabase/seed-local-scouting-ai.sql"], {
  stdio: "inherit",
});
