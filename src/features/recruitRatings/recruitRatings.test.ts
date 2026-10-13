import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseRecruitExternalId } from "./repository";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0075_elite_recruit_weekly_ratings.sql"),
  "utf8",
);
const lastPullMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/0087_recruit_rating_change_since_last_pull.sql"),
  "utf8",
);

test("elite recruit rating migration stores history and schedules all three providers", () => {
  assert.match(migration, /create table if not exists public\.recruit_rating_snapshots/);
  assert.match(migration, /provider in \('utr', 'wtn', 'trn'\)/);
  assert.match(migration, /kind = 'rating' and scope = 'recruits'/);
  assert.match(migration, /time '04:00'/);
  assert.match(migration, /record_recruit_rating/);
});

test("profile IDs are extracted for all recruit rating providers", () => {
  assert.equal(parseRecruitExternalId("utr", "https://app.utrsports.net/profiles/12345"), "12345");
  assert.equal(parseRecruitExternalId("wtn", "https://worldtennisnumber.com/eng/player-profile?id=abc-123"), "abc-123");
  assert.equal(parseRecruitExternalId("trn", "https://tennisrecruiting.net/player.asp?id=456"), "456");
});

test("recruit changes compare each successful acquisition job with the prior pull", () => {
  assert.match(lastPullMigration, /drop constraint if exists recruit_rating_snapshots_week_unique/);
  assert.match(lastPullMigration, /recruit_rating_snapshots_job_unique/);
  assert.match(lastPullMigration, /select rating into last_pulled_rating[\s\S]*order by captured_at desc/);
  assert.match(lastPullMigration, /round\(p_rating - last_pulled_rating, 2\)/);
  assert.match(lastPullMigration, /on conflict \(person_id, provider, job_id\) where job_id is not null/);
  assert.doesNotMatch(lastPullMigration, /when 'utr' then utr/);
});
