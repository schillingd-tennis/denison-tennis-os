#!/usr/bin/env tsx
import { createServer } from "node:http";

import {
  AGENT_HOST,
  AGENT_PORT,
  AGENT_SECRET_HEADER,
  ensureLocalDirs,
  isLoopbackAddress,
  readAgentSecret,
} from "./config.js";
import { runRecruitChecks } from "./runCheck.js";
import type { AgentCheckRequest } from "./types.js";

ensureLocalDirs();
const secret = readAgentSecret();

function jsonResponse(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function unauthorized(res: import("node:http").ServerResponse) {
  jsonResponse(res, 401, { ok: false, error: "Unauthorized" });
}

function readJsonBody<T>(req: import("node:http").IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(raw || "{}") as T);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const remote = req.socket.remoteAddress ?? "";
  if (!isLoopbackAddress(remote)) {
    jsonResponse(res, 403, { ok: false, error: "Forbidden" });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    jsonResponse(res, 200, {
      ok: true,
      service: "denison-utr-results-agent",
      version: "0.1.0",
    });
    return;
  }

  if (req.method === "POST" && req.url === "/check-recruits") {
    if (req.headers[AGENT_SECRET_HEADER.toLowerCase()] !== secret) {
      unauthorized(res);
      return;
    }

    try {
      const body = await readJsonBody<AgentCheckRequest>(req);
      const mode = body.mode === "isaac-only" ? "isaac-only" : "all";
      if (!Array.isArray(body.recruits) || body.recruits.length === 0) {
        jsonResponse(res, 400, { ok: false, error: "recruits array required" });
        return;
      }

      const result = await runRecruitChecks({ mode, recruits: body.recruits });
      jsonResponse(res, 200, { ok: true, ...result });
    } catch (error) {
      if (error instanceof Error && error.message === "AGENT_BUSY") {
        jsonResponse(res, 409, { ok: false, error: "AGENT_BUSY" });
        return;
      }
      jsonResponse(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Check failed.",
      });
    }
    return;
  }

  jsonResponse(res, 404, { ok: false, error: "Not found" });
});

server.listen(AGENT_PORT, AGENT_HOST, () => {
  console.log(`Denison UTR Results Agent listening on http://${AGENT_HOST}:${AGENT_PORT}`);
  console.log(`Browser profile: .local/utr-browser-profile/`);
  console.log(`Agent secret file: .local/utr-agent-secret`);
});
