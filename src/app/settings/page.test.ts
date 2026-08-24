import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const page = readFileSync(path.join(process.cwd(), "src/app/settings/page.tsx"), "utf8");
const card = readFileSync(
  path.join(process.cwd(), "src/features/interactions/appleMessagesSync/AppleMessagesSettingsCard.tsx"),
  "utf8",
);

test("Settings hosts an Apple Messages Integrations card and Sync Messages action", () => {
  assert.match(page, /AppleMessagesSettingsCard/);
  assert.match(page, /getAppleMessagesSyncStatusAction/);
  assert.doesNotMatch(page, /layout-lock/);
  assert.doesNotMatch(page, /data-aw-field-grid/);
  assert.match(card, /Integrations/);
  assert.match(card, /Apple Messages/);
  assert.match(card, /Sync Messages/);
  assert.match(card, /Nightly schedule/);
  assert.match(card, /Last successful sync/);
  assert.match(card, /Current status/);
  assert.match(card, /New interactions imported/);
  assert.match(card, /disabled=\{disabled\}/);
  assert.match(card, /queueAppleMessagesSyncAction/);
});
