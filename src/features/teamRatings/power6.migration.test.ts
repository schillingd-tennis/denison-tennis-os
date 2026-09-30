import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const sql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/0074_team_power_6.sql"),
  "utf8",
);

describe("Denison Power 6 migration", () => {
  it("keeps a dated rating history and seeds the confirmed baseline", () => {
    assert.match(sql, /team_utr_power_6_snapshots/);
    assert.match(sql, /rating_date date not null unique/);
    assert.match(sql, /68\.17/);
  });

  it("keeps writes service-role only", () => {
    assert.match(sql, /record_team_utr_power_6[\s\S]*to service_role/);
    assert.doesNotMatch(sql, /grant execute[^;]+to authenticated/);
  });
});
