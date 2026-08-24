import assert from "node:assert/strict";
import { test } from "node:test";

import { parseHelperConfig, assertProductionSupabaseUrl, HelperConfigError, ProductionHostError } from "./config";

test("public config accepts a hosted supabase URL and rejects service-role keys", () => {
  const parsed = parseHelperConfig(JSON.stringify({ supabaseUrl: "https://abcdefghijklmnop.supabase.co" }));
  assert.equal(parsed.supabaseUrl, "https://abcdefghijklmnop.supabase.co");
  assertProductionSupabaseUrl(parsed.supabaseUrl);
  assert.throws(
    () => parseHelperConfig(JSON.stringify({ supabaseUrl: "https://abcdefghijklmnop.supabase.co", serviceRoleKey: "secret" })),
    (error: unknown) => error instanceof HelperConfigError,
  );
});

test("localhost is rejected as a production host", () => {
  assert.throws(
    () => assertProductionSupabaseUrl("http://127.0.0.1:54321"),
    (error: unknown) => error instanceof ProductionHostError,
  );
});
