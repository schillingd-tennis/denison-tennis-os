import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { listPeople } from "@/features/people/repository";
import { hasRole } from "@/features/people/utils";

import { detectEnvironment } from "./detectEnvironment";
import type {
  ConnectionStatus,
  DeveloperSnapshot,
  MigrationEntry,
  PeopleRoleCounts,
  ServiceStatus,
} from "./types";

export { detectEnvironment };

function dockerPathEnv(): NodeJS.ProcessEnv {
  const home = process.env.HOME ?? "";
  const dockerBin = `${home}/Applications/Docker.app/Contents/Resources/bin`;
  const path = process.env.PATH ?? "";
  return {
    ...process.env,
    PATH: path.includes(dockerBin) ? path : `${dockerBin}:${path}`,
  };
}

function tryExec(command: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(command, args, {
      encoding: "utf-8",
      env: dockerPathEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
    });
    return { ok: true, stdout, stderr: "" };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "Command failed",
    };
  }
}

function probeDocker(): ServiceStatus {
  const result = tryExec("docker", ["info"]);
  return result.ok ? "running" : "stopped";
}

function probeLocalSupabase(): { status: ServiceStatus; studioUrl: string | null } {
  const supabaseBin = resolve(process.cwd(), "node_modules/.bin/supabase");
  const result = tryExec(supabaseBin, ["status", "-o", "env"]);
  if (!result.ok) return { status: "stopped", studioUrl: null };

  let studioUrl: string | null = null;
  for (const line of result.stdout.split("\n")) {
    if (line.startsWith("STUDIO_URL=")) {
      studioUrl = line.slice("STUDIO_URL=".length).replace(/^["']|["']$/g, "");
    }
  }
  return { status: "running", studioUrl: studioUrl ?? "http://127.0.0.1:54323" };
}

function readSeedMeta(): { seedVersion: string; seedRecords?: number } {
  try {
    const seedPath = resolve(process.cwd(), "supabase/seed.sql");
    const head = readFileSync(seedPath, "utf-8").slice(0, 1200);
    const generated = head.match(/Generated:\s*(\S+)/)?.[1];
    const recordsRaw = head.match(/Records:\s*(\d+)/)?.[1];
    return {
      seedVersion: generated ?? "seed.sql (timestamp unknown)",
      seedRecords: recordsRaw ? Number(recordsRaw) : undefined,
    };
  } catch {
    return { seedVersion: "Unavailable" };
  }
}

function listMigrationFiles(): MigrationEntry[] {
  try {
    const dir = resolve(process.cwd(), "supabase/migrations");
    return readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => ({
        version: name.replace(/\.sql$/, "").split("_")[0] ?? name,
        name,
      }));
  } catch {
    return [];
  }
}

function readAppliedMigrations(isLocal: boolean): MigrationEntry[] {
  if (!isLocal) {
    // Hosted: fall back to repo migration files (applied remote history needs db:link).
    return listMigrationFiles();
  }

  const supabaseBin = resolve(process.cwd(), "node_modules/.bin/supabase");
  const result = tryExec(supabaseBin, ["migration", "list", "--local", "-o", "json"]);
  if (!result.ok) return listMigrationFiles();

  try {
    const parsed = JSON.parse(result.stdout) as {
      migrations?: Array<{ local?: string; remote?: string }>;
    };
    const files = listMigrationFiles();
    const applied = new Set(
      (parsed.migrations ?? [])
        .map((row) => row.local ?? row.remote)
        .filter((value): value is string => Boolean(value)),
    );

    if (applied.size === 0) return files;

    return files.filter((entry) => {
      const prefix = entry.version;
      return [...applied].some((a) => a === prefix || entry.name.startsWith(a));
    });
  } catch {
    return listMigrationFiles();
  }
}

async function probeConnection(): Promise<{
  status: ConnectionStatus;
  error?: string;
  people?: PeopleRoleCounts;
}> {
  try {
    const people = await listPeople();
    const counts: PeopleRoleCounts = {
      total: people.length,
      players: people.filter((p) => hasRole(p, "player") && p.status === "current").length,
      coaches: people.filter((p) => hasRole(p, "coach")).length,
      alumni: people.filter((p) => hasRole(p, "alumni") || p.status === "alumni").length,
      staff: people.filter((p) => hasRole(p, "staff")).length,
      recruits: null,
    };
    return { status: "connected", people: counts };
  } catch (error) {
    return {
      status: "not_connected",
      error: error instanceof Error ? error.message : "Failed to query production_people",
      people: {
        total: 0,
        players: 0,
        coaches: 0,
        alumni: 0,
        staff: 0,
        recruits: null,
      },
    };
  }
}

/** Server-only snapshot for the Settings → Developer diagnostics page. */
export async function getDeveloperSnapshot(): Promise<DeveloperSnapshot> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(missing NEXT_PUBLIC_SUPABASE_URL)";
  const environment = detectEnvironment(supabaseUrl);
  const isLocal = environment === "local";

  const connection = await probeConnection();
  const dockerStatus = probeDocker();
  const localSupabase = isLocal
    ? probeLocalSupabase()
    : { status: "unknown" as const, studioUrl: null };
  const migrations = readAppliedMigrations(isLocal);
  const latestMigration = migrations[migrations.length - 1];
  const seed = readSeedMeta();

  return {
    environment,
    bannerLabel: isLocal ? "LOCAL DEVELOPMENT" : "HOSTED PRODUCTION",
    supabaseUrl,
    connectionStatus: connection.status,
    connectionError: connection.error,
    migrationVersion: latestMigration?.name ?? "None",
    migrations,
    seedVersion: seed.seedVersion,
    seedRecords: seed.seedRecords,
    people: connection.people ?? {
      total: 0,
      players: 0,
      coaches: 0,
      alumni: 0,
      staff: 0,
      recruits: null,
    },
    dockerStatus,
    localSupabaseStatus: isLocal ? localSupabase.status : "unknown",
    studioUrl: isLocal ? localSupabase.studioUrl : null,
    localActionsEnabled: isLocal && process.env.NODE_ENV === "development",
    collectedAt: new Date().toISOString(),
  };
}
