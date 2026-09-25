import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, path), "utf8");

describe("provider-neutral outbound acquisition architecture", () => {
  const sectionSource = read("components/UtrAutomaticCheckSection.tsx");
  const statusSource = read("components/UtrBackgroundStatus.tsx");
  const actionsSource = read("backgroundActions.ts");
  const backgroundSource = read("../../../../local-agents/utr-results-agent/src/background.ts");
  const serverSource = read("../../../../local-agents/utr-results-agent/src/server.ts");

  it("hosted UI queues work through Supabase and never calls localhost", () => {
    assert.match(sectionSource, /UtrBackgroundStatus/);
    assert.match(statusSource, /queueAcquisitionJob\("utr"\)/);
    assert.match(actionsSource, /request_tennis_data_job/);
    assert.doesNotMatch(sectionSource, /localhost|requestUtrAgentCheckFromBrowser/);
    assert.doesNotMatch(statusSource, /localhost|requestUtrAgentCheckFromBrowser/);
  });

  it("worker claims durable jobs outbound and retains the existing UTR adapter", () => {
    assert.match(backgroundSource, /claim_tennis_data_job/);
    assert.match(backgroundSource, /PROVIDER = "utr"/);
    assert.match(backgroundSource, /runRecruitChecks/);
    assert.match(backgroundSource, /importSingleUtrAgentRecruitResult/);
  });

  it("provider status distinguishes connectivity from authentication", () => {
    assert.match(statusSource, /auth_status === "reauth_required"/);
    assert.match(statusSource, /heartbeat_at/);
    assert.match(statusSource, /TRN and WTN adapters: not configured/);
  });

  it("local HTTPS server remains an optional diagnostic surface, not the hosted path", () => {
    assert.match(serverSource, /createHttpsServer|node:https/);
    assert.match(serverSource, /startBackgroundWorker/);
    assert.doesNotMatch(sectionSource, /fetchUtrAgentHealthFromBrowser/);
  });
});
