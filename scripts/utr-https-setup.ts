#!/usr/bin/env tsx
/**
 * One-time setup: trusted local HTTPS certificates for the UTR Results Agent.
 * Requires mkcert: brew install mkcert
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = join(import.meta.dirname, "..");
const LOCAL_DIR = join(REPO_ROOT, ".local");
const CERT_FILE = join(LOCAL_DIR, "utr-agent-cert.pem");
const KEY_FILE = join(LOCAL_DIR, "utr-agent-key.pem");

function run(command: string, args: string[]): { ok: boolean; output: string } {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { ok: result.status === 0, output };
}

function which(command: string): string | null {
  const result = run("which", [command]);
  return result.ok && result.output ? result.output.split("\n")[0]?.trim() ?? null : null;
}

function main(): void {
  const mkcertPath = which("mkcert");
  if (!mkcertPath) {
    console.error("mkcert is not installed.");
    console.error("");
    console.error("Install it with:");
    console.error("  brew install mkcert");
    console.error("");
    console.error("Then run this setup again:");
    console.error("  npm run utr:https-setup");
    process.exit(1);
  }

  console.log("Installing local development CA (may prompt for your Mac password)...");
  const install = run(mkcertPath, ["-install"]);
  if (!install.ok) {
    console.error("mkcert -install failed:");
    console.error(install.output || "(no output)");
    process.exit(1);
  }

  mkdirSync(LOCAL_DIR, { recursive: true });

  console.log("Creating UTR agent certificates...");
  const cert = run(mkcertPath, [
    "-cert-file",
    CERT_FILE,
    "-key-file",
    KEY_FILE,
    "localhost",
    "127.0.0.1",
    "::1",
  ]);
  if (!cert.ok) {
    console.error("mkcert certificate generation failed:");
    console.error(cert.output || "(no output)");
    process.exit(1);
  }

  if (!existsSync(CERT_FILE) || !existsSync(KEY_FILE)) {
    console.error("Certificate files were not created:");
    console.error(`  ${CERT_FILE}`);
    console.error(`  ${KEY_FILE}`);
    process.exit(1);
  }

  console.log("");
  console.log("UTR agent HTTPS certificates are ready:");
  console.log(`  ${CERT_FILE}`);
  console.log(`  ${KEY_FILE}`);
  console.log("");
  console.log("Start the agent with:");
  console.log("  npm run utr:agent");
  console.log("");
  console.log("Verify in Safari:");
  console.log("  https://localhost:4317/health");
}

main();
