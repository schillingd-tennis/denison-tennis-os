import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  isAllowedUtrAgentBrowserOrigin,
  UTR_AGENT_ALLOWED_BROWSER_ORIGINS,
} from "./utrAgentAllowedOrigins";

const here = dirname(fileURLToPath(import.meta.url));

describe("UTR agent browser architecture", () => {
  const actionsSource = readFileSync(join(here, "actions.ts"), "utf8");
  const utrAgentRunSource = readFileSync(join(here, "utrAgentRun.ts"), "utf8");
  const sectionSource = readFileSync(
    join(here, "components/UtrAutomaticCheckSection.tsx"),
    "utf8",
  );
  const browserClientSource = readFileSync(join(here, "utrAgentBrowserClient.ts"), "utf8");
  const agentConfigSource = readFileSync(join(here, "utrAgentConfig.ts"), "utf8");
  const importRouteSource = readFileSync(
    join(here, "../../../app/api/recruiting/today-beta/utr-agent-import/route.ts"),
    "utf8",
  );
  const agentServerSource = readFileSync(
    join(here, "../../../../local-agents/utr-results-agent/src/server.ts"),
    "utf8",
  );
  const agentCorsSource = readFileSync(
    join(here, "../../../../local-agents/utr-results-agent/src/cors.ts"),
    "utf8",
  );

  it("1. production health check is client-side", () => {
    assert.match(sectionSource, /fetchUtrAgentHealthFromBrowser/);
    assert.doesNotMatch(sectionSource, /result\.data\.online/);
  });

  it("2. browser client calls loopback agent with CORS", () => {
    assert.match(agentConfigSource, /127\.0\.0\.1:4317/);
    assert.match(browserClientSource, /UTR_AGENT_BASE_URL/);
    assert.match(browserClientSource, /mode: "cors"/);
    assert.match(browserClientSource, /\/health/);
    assert.match(browserClientSource, /\/check-recruits/);
  });

  it("3. Vercel server does NOT call localhost agent for checks", () => {
    assert.doesNotMatch(actionsSource, /fetchUtrAgentHealth\(\)/);
    assert.match(utrAgentRunSource, /Vercel cannot reach the local agent/);
    assert.doesNotMatch(sectionSource, /runUtrAutomaticCheckAction/);
  });

  it("4–6. allowed CORS origins include local dev and production", () => {
    assert.ok(isAllowedUtrAgentBrowserOrigin("http://localhost:3000"));
    assert.ok(isAllowedUtrAgentBrowserOrigin("http://localhost:3001"));
    assert.ok(isAllowedUtrAgentBrowserOrigin("https://denison-tennis-os.vercel.app"));
    assert.equal(isAllowedUtrAgentBrowserOrigin("https://evil.example"), false);
    assert.match(agentCorsSource, /denison-tennis-os\.vercel\.app/);
    for (const origin of UTR_AGENT_ALLOWED_BROWSER_ORIGINS) {
      assert.match(agentCorsSource, new RegExp(origin.replace(/\./g, "\\.")));
    }
  });

  it("7. agent rejects disallowed browser origin on OPTIONS", () => {
    assert.match(agentServerSource, /req\.method === "OPTIONS"/);
    assert.match(agentServerSource, /Origin not allowed/);
  });

  it("8. production import endpoint requires authenticated Denison user", () => {
    assert.match(importRouteSource, /getUser\(\)/);
    assert.match(importRouteSource, /importUtrAgentCheckResults/);
    assert.match(importRouteSource, /status: 401/);
  });

  it("9. browser posts agent payload to same-origin import API", () => {
    assert.match(sectionSource, /\/api\/recruiting\/today-beta\/utr-agent-import/);
    assert.match(sectionSource, /requestUtrAgentCheckFromBrowser/);
  });

  it("10. agent allows browser auth via Origin without exposing secret in client", () => {
    assert.match(agentServerSource, /isAuthorizedBrowserRequest/);
    assert.doesNotMatch(browserClientSource, /UTR_AGENT_SECRET/);
    assert.doesNotMatch(browserClientSource, /X-Denison-Utr-Agent-Secret/);
  });

  it("11. Check button enables when local agent is online", () => {
    assert.match(sectionSource, /disabled=\{busy \|\| !agentOnline/);
  });

  it("12–13. baseline import semantics and Rank Board cohort preserved in import pipeline", () => {
    assert.match(utrAgentRunSource, /importUtrAgentCheckResults/);
    assert.match(utrAgentRunSource, /processUtrAgentRecruitResult/);
    assert.match(actionsSource, /getUtrAgentRecruitRequestsAction/);
    assert.match(actionsSource, /countMonitoredRecruitsForBatch/);
  });
});
