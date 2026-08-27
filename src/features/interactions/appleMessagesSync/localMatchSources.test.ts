import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { loadHandleOverrides } from "./localMatchSources";

test("handle overrides load from helper home without logging values", () => {
  const home = mkdtempSync(join(tmpdir(), "ams-overrides-"));
  writeFileSync(
    join(home, "apple-messages-overrides.json"),
    JSON.stringify({ "Recruit Name": "+15555550100" }),
  );
  const overrides = loadHandleOverrides(home);
  assert.equal(Object.keys(overrides).length, 1);
  assert.equal(JSON.stringify(Object.keys(overrides)).includes("+15555550100"), false);
});
