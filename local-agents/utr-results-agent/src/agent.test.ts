import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { preflightRecruitCheck } from "./checkRecruit.js";
import { isLoopbackAddress, AGENT_HOST } from "./config.js";
import { selectRecruitsForMode } from "./runCheck.js";

describe("denison-utr-results-agent", () => {
  it("1. binds only to loopback host constant", () => {
    assert.equal(AGENT_HOST, "127.0.0.1");
  });

  it("2. accepts loopback remote addresses", () => {
    assert.equal(isLoopbackAddress("127.0.0.1"), true);
    assert.equal(isLoopbackAddress("::1"), true);
    assert.equal(isLoopbackAddress("localhost"), true);
    assert.equal(isLoopbackAddress("192.168.1.10"), false);
  });

  it("3. missing UTR ID returns NOT_CONFIGURED preflight", () => {
    const result = preflightRecruitCheck({
      recruitPersonId: "p1",
      displayName: "Cole LaFors",
    });
    assert.ok(result);
    assert.equal(result.status, "NOT_CONFIGURED");
    assert.equal(result.errorCode, "UTR_PROFILE_NOT_CONFIGURED");
  });

  it("4. configured recruit passes preflight", () => {
    const result = preflightRecruitCheck({
      recruitPersonId: "p1",
      displayName: "Isaac Lewis",
      utrPlayerId: "3186547",
    });
    assert.equal(result, null);
  });

  it("5. isaac-only mode filters to Isaac", () => {
    const recruits = [
      { recruitPersonId: "1", displayName: "Isaac Lewis", utrPlayerId: "3186547" },
      { recruitPersonId: "2", displayName: "Adam Roman", utrPlayerId: "999" },
    ];
    const queue = selectRecruitsForMode(recruits, "isaac-only");
    assert.equal(queue.length, 1);
    assert.equal(queue[0]?.displayName, "Isaac Lewis");
  });

  it("6. all mode keeps full recruit list", () => {
    const recruits = [
      { recruitPersonId: "1", displayName: "Isaac Lewis", utrPlayerId: "3186547" },
      { recruitPersonId: "2", displayName: "Adam Roman", utrPlayerId: "999" },
    ];
    const queue = selectRecruitsForMode(recruits, "all");
    assert.equal(queue.length, 2);
  });
});
