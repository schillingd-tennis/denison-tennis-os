import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const sql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/0072_team_weekly_ratings.sql"),
  "utf8",
);

describe("weekly team ratings migration", () => {
  it("keeps immutable per-player provider history", () => {
    assert.match(sql, /create table if not exists public\.team_player_rating_snapshots/);
    assert.match(sql, /unique \(person_id, provider, rating_date\)/);
    assert.match(sql, /previous_rating/);
    assert.match(sql, /rating_change/);
  });

  it("schedules team UTR ratings after Wednesday 04:00 Eastern", () => {
    assert.match(sql, /America\/New_York/);
    assert.match(sql, /time '04:00'/);
    assert.match(sql, /kind = 'rating' and scope = 'team'/);
    assert.match(sql, /values \(p_provider, 'rating', 'team', 'schedule'\)/);
  });

  it("keeps writes service-role only", () => {
    assert.match(sql, /record_team_player_rating[\s\S]*to service_role/);
    const grant = sql.match(
      /grant execute on function public\.record_team_player_rating\([^;]+;/,
    )?.[0] ?? "";
    assert.match(grant, /to service_role/);
    assert.doesNotMatch(grant, /to authenticated/);
  });

  it("does not delete or truncate production data", () => {
    assert.doesNotMatch(sql, /delete from public\.production_people/i);
    assert.doesNotMatch(sql, /truncate/i);
  });
});
