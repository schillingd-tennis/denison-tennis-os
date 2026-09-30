#!/usr/bin/env tsx

import { startBackgroundWorker } from "./background.js";
import { startWtnBackgroundWorker } from "./wtnBackground.js";

console.log("Local UTR and WTN ratings workers started. Press Control-C to stop.");
startBackgroundWorker();
startWtnBackgroundWorker();
