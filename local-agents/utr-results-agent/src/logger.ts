import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { LOG_DIR } from "./config.js";
import { printRecruitDiagnosticSummary, sanitizeResponseBody } from "./diagnostics.js";
import type { AgentRunLogEntry } from "./types.js";

const REDACT_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /jwt/i,
  /bearer\s+/i,
  /password/i,
  /set-cookie/i,
  /access_token/i,
];

export function safeLogMessage(message: string): string {
  const sanitized = sanitizeResponseBody(message, 500);
  if (REDACT_PATTERNS.some((pattern) => pattern.test(sanitized))) {
    return "[redacted]";
  }
  return sanitized;
}

export function appendRunLog(entry: AgentRunLogEntry): void {
  mkdirSync(LOG_DIR, { recursive: true });
  const path = join(LOG_DIR, "runs.jsonl");
  appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
}

export function logRecruitDiagnostics(entry: AgentRunLogEntry): void {
  appendRunLog(entry);
  if (entry.diagnostics) {
    printRecruitDiagnosticSummary(entry.recruit, entry.diagnostics);
  }
}
