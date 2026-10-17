import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("tournament TRN enrichment is queued for the browser worker", () => {
  const repository = readFileSync(new URL("./repository.ts", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../../../local-agents/utr-results-agent/src/trnBackground.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../../../supabase/migrations/0091_tournament_trn_profile_jobs.sql", import.meta.url), "utf8");
  const reviewMigration = readFileSync(new URL("../../../supabase/migrations/0092_tournament_player_review_pool.sql", import.meta.url), "utf8");
  assert.match(repository, /request_tournament_trn_profile_job/);
  assert.match(worker, /findPublicTrnProfile/);
  assert.match(worker, /job\.kind === "profile"/);
  assert.match(worker, /recruiting_tournament_participants/);
  assert.match(reviewMigration, /class_year integer/);
  assert.match(migration, /scope in \('recruits', 'team', 'tournament'\)/);
  assert.match(migration, /grant execute on function public\.request_tournament_trn_profile_job\(uuid\) to authenticated/);
});
