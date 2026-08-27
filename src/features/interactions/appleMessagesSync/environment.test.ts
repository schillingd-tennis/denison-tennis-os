import assert from "node:assert/strict";
import { test } from "node:test";

import { isManualAppleMessagesSyncAvailable } from "./environment";

test("manual sync is available only on hosted production Supabase", () => {
  assert.equal(isManualAppleMessagesSyncAvailable("https://abcdefghijklmn.supabase.co"), true);
  assert.equal(isManualAppleMessagesSyncAvailable("http://127.0.0.1:54321"), false);
  assert.equal(isManualAppleMessagesSyncAvailable("http://localhost:54321"), false);
  assert.equal(isManualAppleMessagesSyncAvailable(""), false);
  assert.equal(isManualAppleMessagesSyncAvailable("not-a-url"), false);
});
