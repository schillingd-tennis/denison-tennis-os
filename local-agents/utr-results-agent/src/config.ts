import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const AGENT_HOST = "127.0.0.1";
export const AGENT_PORT = 4317;
export const AGENT_BASE_URL = `http://${AGENT_HOST}:${AGENT_PORT}`;

export const REPO_ROOT = join(import.meta.dirname, "../../..");
export const PROFILE_DIR = join(REPO_ROOT, ".local/utr-browser-profile");
export const SECRET_FILE = join(REPO_ROOT, ".local/utr-agent-secret");
export const LOG_DIR = join(REPO_ROOT, ".local/utr-agent-logs");

export const PAUSE_BETWEEN_RECRUITS_MS = 2000;
export const MAX_RETRIES = 2;
export const ISAAC_UTR_PLAYER_ID = "3186547";

export const AGENT_SECRET_HEADER = "X-Denison-Utr-Agent-Secret";

/** Visible Chromium for Isaac diagnostic runs — set UTR_AGENT_DEBUG_BROWSER=true */
export const DEBUG_BROWSER_CLOSE_DELAY_MS = 8_000;

export function isDebugBrowser(): boolean {
  return process.env.UTR_AGENT_DEBUG_BROWSER === "true";
}

export function ensureLocalDirs(): void {
  mkdirSync(join(REPO_ROOT, ".local"), { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  mkdirSync(PROFILE_DIR, { recursive: true });
}

export function readAgentSecret(): string {
  ensureLocalDirs();
  if (process.env.UTR_AGENT_SECRET?.trim()) {
    return process.env.UTR_AGENT_SECRET.trim();
  }
  if (existsSync(SECRET_FILE)) {
    return readFileSync(SECRET_FILE, "utf8").trim();
  }
  const generated = `utr-agent-${cryptoRandom()}`;
  writeFileSync(SECRET_FILE, `${generated}\n`, "utf8");
  return generated;
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function isLoopbackAddress(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}
