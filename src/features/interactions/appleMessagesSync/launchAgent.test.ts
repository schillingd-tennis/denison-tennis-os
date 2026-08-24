import assert from "node:assert/strict";
import { test } from "node:test";

import {
  renderLaunchAgentPlist,
  LaunchAgentPathError,
  LAUNCH_AGENT_LABEL,
  LAUNCH_AGENT_POLL_SECONDS,
  LAUNCH_AGENT_HOUR,
  LAUNCH_AGENT_MINUTE,
} from "./launchAgent";

test("LaunchAgent plist uses only absolute paths, polls every five minutes, and never calls npx", () => {
  const plist = renderLaunchAgentPlist({
    nodeBin: "/usr/local/bin/node",
    helperJs: "/Users/david/helpers/apple-messages-sync/appleMessagesSync/helperMain.js",
    appSupport: "/Users/david/Library/Application Support/DenisonTennisOS",
    logOut: "/Users/david/Library/Logs/apple-messages-sync.out.log",
    logErr: "/Users/david/Library/Logs/apple-messages-sync.err.log",
  });
  assert.match(plist, /<string>com.denison.tennis-os.apple-messages-sync<\/string>/);
  assert.match(plist, /<integer>300<\/integer>/);
  assert.match(plist, /<integer>23<\/integer>/);
  assert.match(plist, /<string>--tick<\/string>/);
  assert.doesNotMatch(plist, /\bnpx\b/);
  assert.equal(LAUNCH_AGENT_LABEL, "com.denison.tennis-os.apple-messages-sync");
  assert.equal(LAUNCH_AGENT_POLL_SECONDS, 300);
  assert.equal(LAUNCH_AGENT_HOUR, 23);
  assert.equal(LAUNCH_AGENT_MINUTE, 0);
  assert.throws(
    () => renderLaunchAgentPlist({
      nodeBin: "node",
      helperJs: "/tmp/helper.js",
      appSupport: "/tmp/app",
      logOut: "/tmp/out.log",
      logErr: "/tmp/err.log",
    }),
    (error: unknown) => error instanceof LaunchAgentPathError,
  );
});
