#!/usr/bin/env tsx
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const REPO_ROOT = join(import.meta.dirname, "..");
const isLocal = process.argv.includes("--local");
const PROFILE_DIR = join(
  REPO_ROOT,
  isLocal ? ".local/trn-browser-profile-local" : ".local/trn-browser-profile",
);
const TRN_HOME = "https://www.tennisrecruiting.net";
const CHROME_EXECUTABLE = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function stopChrome(chrome: ChildProcess): Promise<void> {
  if (chrome.exitCode != null || chrome.signalCode != null) return;
  chrome.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => chrome.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (chrome.exitCode == null && chrome.signalCode == null) chrome.kill("SIGKILL");
}

async function main(): Promise<void> {
  mkdirSync(PROFILE_DIR, { recursive: true });
  console.log(`Opening Google Chrome for TennisRecruiting.net ${isLocal ? "localhost" : "live"} login...`);
  console.log(`Dedicated profile directory: ${PROFILE_DIR}`);
  console.log("This is a normal Chrome window so human verification can complete.");
  console.log("Complete the verification and log in normally. Do not enter credentials in Terminal.");

  const chrome = spawn(
    CHROME_EXECUTABLE,
    [
      `--user-data-dir=${PROFILE_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-mode",
      TRN_HOME,
    ],
    { stdio: "ignore" },
  );

  console.log("\nWhen you can see that you are signed in:");
  console.log("1. Return here and press Enter.");
  console.log("2. This command will close the dedicated Chrome process and fully save its session.");
  const rl = readline.createInterface({ input, output });
  await rl.question("");
  rl.close();
  await stopChrome(chrome);
  console.log("TennisRecruiting.net login session saved in the dedicated Chrome profile.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
