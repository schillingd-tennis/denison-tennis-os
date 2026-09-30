import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0073_wtn_weekly_ratings.sql"), "utf8");

describe("WTN weekly ratings migration", () => {
  it("schedules both UTR and WTN team ratings on Wednesday", () => {
    assert.match(sql, /p_provider in \('utr', 'wtn'\)/);
    assert.match(sql, /time '04:00'/);
    assert.match(sql, /values \(p_provider, 'rating', 'team', 'schedule'\)/);
  });

  it("does not schedule unsupported WTN recruit-result jobs", () => {
    assert.match(sql, /p_provider = 'utr'[\s\S]*'results', 'recruits'/);
  });
});
