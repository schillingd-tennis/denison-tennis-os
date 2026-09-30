#!/usr/bin/env tsx

import { startBackgroundWorker } from "./background.js";

console.log("Local UTR ratings worker started. Press Control-C to stop.");
startBackgroundWorker();
