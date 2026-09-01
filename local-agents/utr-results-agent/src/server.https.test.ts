import assert from "node:assert/strict";
import { createServer as createHttpsServer, request as httpsRequest } from "node:https";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { after, before, describe, it } from "node:test";

import { AGENT_HOST } from "./config.js";
import { corsHeadersForOrigin } from "./cors.js";
import { createAgentRequestHandler } from "./requestHandler.js";

function createEphemeralTlsCredentials(dir: string): { cert: Buffer; key: Buffer } {
  const certPath = join(dir, "cert.pem");
  const keyPath = join(dir, "key.pem");
  const result = spawnSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "1",
      "-nodes",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || "openssl failed to create test certificates");
  }
  return {
    cert: readFileSync(certPath),
    key: readFileSync(keyPath),
  };
}

function httpsJsonRequest(input: {
  port: number;
  path: string;
  method: string;
  headers?: Record<string, string>;
}): Promise<{ statusCode?: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        hostname: "localhost",
        port: input.port,
        path: input.path,
        method: input.method,
        rejectUnauthorized: false,
        headers: input.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
            headers: res.headers,
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("UTR agent HTTPS server", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "utr-agent-https-"));
  const tls = createEphemeralTlsCredentials(tempDir);
  const secret = "test-secret";
  const handler = createAgentRequestHandler(secret);
  const server = createHttpsServer(tls, async (req, res) => {
    await handler(req, res);
  });
  let port = 0;

  before(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, AGENT_HOST, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected server address");
    }
    port = address.port;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("7. health endpoint works over HTTPS", async () => {
    const response = await httpsJsonRequest({
      port,
      path: "/health",
      method: "GET",
    });
    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body) as { ok?: boolean; service?: string };
    assert.equal(body.ok, true);
    assert.equal(body.service, "denison-utr-results-agent");
  });

  it("6. OPTIONS preflight succeeds for production origin", async () => {
    const response = await httpsJsonRequest({
      port,
      path: "/check-recruits",
      method: "OPTIONS",
      headers: {
        Origin: "https://denison-tennis-os.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
        "Access-Control-Request-Private-Network": "true",
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "https://denison-tennis-os.vercel.app",
    );
    assert.equal(response.headers["access-control-allow-private-network"], "true");
  });

  it("5. disallowed origin is rejected on OPTIONS", async () => {
    const response = await httpsJsonRequest({
      port,
      path: "/health",
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example",
        "Access-Control-Request-Method": "GET",
      },
    });

    assert.equal(response.statusCode, 403);
  });

  it("4. approved production Origin gets CORS headers", () => {
    const headers = corsHeadersForOrigin("https://denison-tennis-os.vercel.app", {
      privateNetwork: true,
    });
    assert.ok(headers);
    assert.equal(headers?.["Access-Control-Allow-Origin"], "https://denison-tennis-os.vercel.app");
    assert.equal(headers?.["Access-Control-Allow-Private-Network"], "true");
  });

  it("8. check-recruits accepts HTTPS POST from allowed browser origin", async () => {
    const { request } = await import("node:https");
    const response = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      const req = request(
        {
          hostname: "localhost",
          port,
          path: "/check-recruits",
          method: "POST",
          rejectUnauthorized: false,
          headers: {
            Origin: "https://denison-tennis-os.vercel.app",
            "Content-Type": "application/json",
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          res.on("end", () => {
            resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString("utf8") });
          });
        },
      );
      req.on("error", reject);
      req.write(JSON.stringify({ mode: "all", recruits: [] }));
      req.end();
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.body, /recruits array required/);
  });

  it("9. agent remains loopback-only", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      assert.fail("expected server address");
    }
    assert.equal(address.address, AGENT_HOST);
  });
});
