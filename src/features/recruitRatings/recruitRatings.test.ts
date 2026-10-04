import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parseRecruitExternalId } from "./repository";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0075_elite_recruit_weekly_ratings.sql"),
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
