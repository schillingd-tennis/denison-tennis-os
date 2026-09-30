import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";

function parseEnv(output: string): Record<string, string> {
  return Object.fromEntries(output.split("\n").flatMap((line) => {
    const equals = line.indexOf("=");
    if (equals < 1) return [];
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return [[key, value]];
  }));
}

const supabaseBin = resolve(process.cwd(), "node_modules/.bin/supabase");
const status = execFileSync(supabaseBin, ["status", "-o", "env"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
const local = parseEnv(status);
const apiUrl = local.API_URL;
const serviceRole = local.SERVICE_ROLE_KEY;
if (!apiUrl || !serviceRole) {
  throw new Error("Local Supabase did not provide API_URL and SERVICE_ROLE_KEY. Run npm run db:start first.");
}

console.log(`Starting UTR background worker against ${apiUrl}`);
const tsxBin = resolve(process.cwd(), "node_modules/.bin/tsx");
const child = spawn(tsxBin, ["local-agents/utr-results-agent/src/localBackground.ts"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    UTR_AGENT_LOCAL_SUPABASE_URL: apiUrl,
    UTR_AGENT_LOCAL_SERVICE_ROLE_KEY: serviceRole,
  },
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
