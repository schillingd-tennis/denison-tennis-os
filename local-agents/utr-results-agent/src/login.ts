#!/usr/bin/env tsx
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { closePersistentContext, getPersistentContext } from "./browser.js";
import { ensureLocalDirs, PROFILE_DIR } from "./config.js";

ensureLocalDirs();

async function main() {
  console.log("Opening Chromium for UTR login...");
  console.log(`Profile directory: ${PROFILE_DIR}`);
  console.log("Log into UTR normally in the browser window. Do not enter credentials in Terminal.");

  const context = await getPersistentContext({ headless: false });
  const page = await context.newPage();
  await page.goto("https://app.utrsports.net/", { waitUntil: "domcontentloaded" });

  console.log("\nWhen you are signed in to UTR, press Enter here (or close the browser window).");
  const rl = readline.createInterface({ input, output });
  await rl.question("");
  rl.close();

  await page.close();
  await closePersistentContext();
  console.log("UTR login session saved. You can start the agent with: npm run utr:agent");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
