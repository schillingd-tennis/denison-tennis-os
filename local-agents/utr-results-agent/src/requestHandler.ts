import type { IncomingMessage, ServerResponse } from "node:http";

import { AGENT_SECRET_HEADER } from "./config.js";
import { corsHeadersForOrigin, isAllowedBrowserOrigin } from "./cors.js";
import { runRecruitChecks } from "./runCheck.js";
import type { AgentCheckRequest } from "./types.js";

export function jsonResponse(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  res.writeHead(status, { "Content-Type": "application/json", ...extraHeaders });
  res.end(JSON.stringify(body));
}

function unauthorized(res: ServerResponse, cors: Record<string, string> | null) {
  jsonResponse(res, 401, { ok: false, error: "Unauthorized" }, cors ?? {});
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
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

function isAuthorizedBrowserRequest(req: IncomingMessage): boolean {
  return isAllowedBrowserOrigin(req.headers.origin);
}

function isAuthorizedServerRequest(req: IncomingMessage, secret: string): boolean {
  return req.headers[AGENT_SECRET_HEADER.toLowerCase()] === secret;
}

function corsForRequest(req: IncomingMessage): Record<string, string> | null {
  const privateNetwork = req.headers["access-control-request-private-network"] === "true";
  return corsHeadersForOrigin(req.headers.origin, { privateNetwork });
}

export function createAgentRequestHandler(secret: string) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const cors = corsHeadersForOrigin(req.headers.origin);

    if (req.method === "OPTIONS") {
      const preflightCors = corsForRequest(req);
      if (!preflightCors) {
        jsonResponse(res, 403, { ok: false, error: "Origin not allowed" });
        return;
      }
      res.writeHead(204, preflightCors);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      jsonResponse(
        res,
        200,
        {
          ok: true,
          service: "denison-utr-results-agent",
          version: "0.1.0",
        },
        cors ?? {},
      );
      return;
    }

    if (req.method === "POST" && req.url === "/check-recruits") {
      const browserAuth = isAuthorizedBrowserRequest(req);
      const serverAuth = isAuthorizedServerRequest(req, secret);
      if (!browserAuth && !serverAuth) {
        unauthorized(res, cors);
        return;
      }

      try {
        const body = await readJsonBody<AgentCheckRequest>(req);
        const mode = body.mode === "isaac-only" ? "isaac-only" : "all";
        if (!Array.isArray(body.recruits) || body.recruits.length === 0) {
          jsonResponse(res, 400, { ok: false, error: "recruits array required" }, cors ?? {});
          return;
        }

        const result = await runRecruitChecks({ mode, recruits: body.recruits });
        jsonResponse(res, 200, { ok: true, ...result }, cors ?? {});
      } catch (error) {
        if (error instanceof Error && error.message === "AGENT_BUSY") {
          jsonResponse(res, 409, { ok: false, error: "AGENT_BUSY" }, cors ?? {});
          return;
        }
        jsonResponse(
          res,
          500,
          {
            ok: false,
            error: error instanceof Error ? error.message : "Check failed.",
          },
          cors ?? {},
        );
      }
      return;
    }

    jsonResponse(res, 404, { ok: false, error: "Not found" }, cors ?? {});
  };
}
