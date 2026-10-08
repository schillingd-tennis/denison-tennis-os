#!/usr/bin/env tsx
import { createServer as createHttpsServer } from "node:https";

import {
  AGENT_BASE_URL,
  AGENT_HOST,
  AGENT_PORT,
  ensureLocalDirs,
  isLoopbackAddress,
  readAgentSecret,
} from "./config.js";
import { createAgentRequestHandler, jsonResponse } from "./requestHandler.js";
import { HTTPS_CERT_MISSING_MESSAGE, loadAgentTlsCredentials } from "./tls.js";
import { closeTrnContext } from "./trnBrowser.js";

ensureLocalDirs();
const secret = readAgentSecret();

let tlsCredentials: { cert: Buffer; key: Buffer };
try {
  tlsCredentials = loadAgentTlsCredentials();
} catch (error) {
  const message = error instanceof Error ? error.message : HTTPS_CERT_MISSING_MESSAGE;
  console.error(message);
  process.exit(1);
}

const server = createHttpsServer(tlsCredentials, async (req, res) => {
  const remote = req.socket.remoteAddress ?? "";
  if (!isLoopbackAddress(remote)) {
    jsonResponse(res, 403, { ok: false, error: "Forbidden" });
    return;
  }

  await createAgentRequestHandler(secret)(req, res);
});

server.listen(AGENT_PORT, AGENT_HOST, () => {
  console.log(`Denison UTR Results Agent listening on ${AGENT_BASE_URL}`);
  console.log(`Browser profile: .local/utr-browser-profile/`);
  console.log(`Agent secret file: .local/utr-agent-secret`);
  console.log(`HTTPS certificates: .local/utr-agent-cert.pem`);
});

// The explicit service flag keeps tests and ad-hoc diagnostic servers read-only.
if (process.env.UTR_BACKGROUND_ENABLED === "true") {
  void Promise.all([import("./background.js"), import("./wtnBackground.js"), import("./trnBackground.js"), import("./automationWatchdog.js")])
    .then(([{ startBackgroundWorker }, { startWtnBackgroundWorker }, { startTrnBackgroundWorker }, { startAutomationWatchdog }]) => {
      const stopWorkers = [
        startBackgroundWorker(),
        startWtnBackgroundWorker(),
        startTrnBackgroundWorker(),
        startAutomationWatchdog(),
      ];
      let stopping = false;
      const stop = async (signal: NodeJS.Signals) => {
        if (stopping) return;
        stopping = true;
        console.log(`Stopping ratings service after ${signal}...`);
        stopWorkers.forEach((stopWorker) => stopWorker());
        await closeTrnContext();
        process.exitCode = 0;
        server.close();
      };
      process.once("SIGINT", () => void stop("SIGINT"));
      process.once("SIGTERM", () => void stop("SIGTERM"));
    })
    .catch(() => {
      // Keep manual localhost checks available even if the hosted worker setup is incomplete.
      console.error(
        "Unable to start UTR background worker. Verify Keychain credentials and migration 0070.",
      );
    });
}
