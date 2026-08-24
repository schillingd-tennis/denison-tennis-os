import assert from "node:assert/strict";
import { test } from "node:test";

import { createQueuedJob } from "./jobQueue";
import { createSupabaseJobStore, jobFromRow, jobToInsert } from "./jobQueueSupabase";

test("job row mapping never includes a message body", () => {
  const job = createQueuedJob({
    trigger: "manual",
    requestedBy: "user-1",
    now: new Date("2024-06-15T12:00:00.000Z"),
  });
  const insert = jobToInsert(job);
  assert.equal("notes" in insert, false);
  assert.equal("body" in insert, false);
  const roundTrip = jobFromRow({
    id: job.id,
    trigger: "manual",
    status: "queued",
    requested_by: "user-1",
    requested_at: job.requestedAt,
    started_at: null,
    heartbeat_at: null,
    lease_expires_at: null,
    finished_at: null,
    imported_count: null,
    error_code: null,
  });
  assert.equal(roundTrip.requestedBy, "user-1");
  assert.equal(JSON.stringify(roundTrip).includes("Loved an iMessage"), false);
});

test("supabase adapter treats unique violation as an existing active job race", async () => {
  const client = {
    from: () => ({
      insert: () => ({
        select: () => ({
          maybeSingle: async () => ({ data: null, error: { code: "23505", message: "duplicate" } }),
        }),
      }),
    }),
  };
  const store = createSupabaseJobStore(client as never);
  const result = await store.insertQueued(
    createQueuedJob({ trigger: "manual", requestedBy: "user-1", now: new Date() }),
  );
  assert.equal(result, "unique_violation");
});
