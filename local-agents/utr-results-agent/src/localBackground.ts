#!/usr/bin/env tsx

import { startBackgroundWorker } from "./background.js";
import { startTrnBackgroundWorker } from "./trnBackground.js";
import { startWtnBackgroundWorker } from "./wtnBackground.js";
import { startAutomationWatchdog } from "./automationWatchdog.js";
import { closeTrnContext } from "./trnBrowser.js";

console.log("Local UTR, WTN, and TRN ratings workers started. Press Control-C to stop.");
const stopWorkers = [
  startBackgroundWorker(),
  startWtnBackgroundWorker(),
  startTrnBackgroundWorker(),
  startAutomationWatchdog(),
];

let stopping = false;
async function stop(signal: NodeJS.Signals): Promise<void> {
  if (stopping) return;
  stopping = true;
  console.log(`Stopping ratings workers after ${signal}...`);
  stopWorkers.forEach((stopWorker) => stopWorker());
  await closeTrnContext();
  process.exit(0);
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
