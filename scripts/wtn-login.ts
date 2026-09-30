#!/usr/bin/env tsx
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { chromium } from "playwright";

const REPO_ROOT = join(import.meta.dirname, "..");
const PROFILE_DIR = join(REPO_ROOT, ".local/wtn-browser-profile");
const WTN_HOME = "https://worldtennisnumber.com/eng";

async function main(): Promise<void> {
  mkdirSync(PROFILE_DIR, { recursive: true });

  console.log("Opening Chromium for WTN login...");
  console.log(`Dedicated profile directory: ${PROFILE_DIR}`);
  console.log("This profile is separate from Chrome and the UTR browser profile.");
  console.log("Log into WTN normally in the browser window. Do not enter credentials in Terminal.");

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: null,
  });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(WTN_HOME, { waitUntil: "domcontentloaded" });

  console.log("\nWhen you are signed in to WTN, return here and press Enter.");
  const rl = readline.createInterface({ input, output });
  await rl.question("");
  rl.close();

  await context.close();
  console.log("WTN login session saved in the dedicated Chromium profile.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
