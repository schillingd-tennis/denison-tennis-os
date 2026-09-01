import { existsSync, readFileSync } from "node:fs";

import { CERT_FILE, KEY_FILE } from "./config.js";

export const HTTPS_CERT_MISSING_MESSAGE =
  "UTR Agent HTTPS certificates not configured. Run npm run utr:https-setup.";

export function loadAgentTlsCredentials(): { cert: Buffer; key: Buffer } {
  if (!existsSync(CERT_FILE) || !existsSync(KEY_FILE)) {
    throw new Error(HTTPS_CERT_MISSING_MESSAGE);
  }

  return {
    cert: readFileSync(CERT_FILE),
    key: readFileSync(KEY_FILE),
  };
}
