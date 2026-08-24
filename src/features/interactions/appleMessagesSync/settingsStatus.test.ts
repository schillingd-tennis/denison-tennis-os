import assert from "node:assert/strict";
import { test } from "node:test";

import { EMPTY_VALUE } from "@/lib/formatting";

import { createQueuedJob, createMemoryJobQueue, enqueueManualForUser } from "./jobQueue";
import type { SyncJob, SyncStatus } from "./ports";
import {
  CONNECTION_DESCRIPTION,
  canQueueManualSync,
  emptySyncStatus,
  formatLastSuccessfulSync,
  isLiveSyncJob,
  latestImportedCountLabel,
  nightlyScheduleLabel,
  settingsStatusLabel,
  statusAfterManualEnqueue,
} from "./settingsStatus";

function job(partial: Partial<SyncJob> & Pick<SyncJob, "status">): SyncJob {
  return {
    ...createQueuedJob({
      trigger: "manual",
      requestedBy: "user-1",
      now: new Date("2026-08-17T12:00:00.000Z"),
    }),
    ...partial,
  };
}

function status(partial: Partial<SyncStatus>): SyncStatus {
  return { ...emptySyncStatus(), ...partial };
}

test("connection copy and nightly schedule are Mac-local and 11:00 PM", () => {
  assert.equal(CONNECTION_DESCRIPTION, "Sync runs from this Mac.");
  assert.equal(nightlyScheduleLabel(), "11:00 PM");
});

test("status is Idle when nothing has run", () => {
  assert.equal(settingsStatusLabel(emptySyncStatus()), "Idle");
  assert.equal(canQueueManualSync(emptySyncStatus()), true);
  assert.equal(latestImportedCountLabel(emptySyncStatus()), EMPTY_VALUE);
  assert.equal(formatLastSuccessfulSync(null), EMPTY_VALUE);
});

test("queued and running jobs are live and disable Sync Messages", () => {
  const queued = status({ activeJob: job({ status: "queued" }) });
  const running = status({ activeJob: job({ status: "running" }) });
  assert.equal(settingsStatusLabel(queued), "Queued");
  assert.equal(settingsStatusLabel(running), "Running");
  assert.equal(isLiveSyncJob(queued.activeJob), true);
  assert.equal(canQueueManualSync(queued), false);
  assert.equal(canQueueManualSync(running), false);
});

test("completed and failed terminal jobs surface after the helper finishes", () => {
  const completed = job({
    status: "completed",
    finishedAt: "2026-08-17T15:05:00.000Z",
    importedCount: 4,
  });
  const failed = job({
    status: "failed",
    finishedAt: "2026-08-18T03:01:00.000Z",
    importedCount: null,
    errorCode: "lease_expired",
  });
  assert.equal(
    settingsStatusLabel(status({ lastCompleted: completed, lastFinished: completed })),
    "Completed",
  );
  assert.equal(
    settingsStatusLabel(status({ lastCompleted: completed, lastFinished: failed })),
    "Failed",
  );
  assert.equal(latestImportedCountLabel(status({ lastCompleted: completed })), "4");
  assert.equal(latestImportedCountLabel(status({ lastCompleted: completed, lastFinished: failed })), "4");
  assert.match(formatLastSuccessfulSync(completed.finishedAt), /2026/);
});

test("a repeated Sync Messages click keeps the existing live job", async () => {
  const queue = createMemoryJobQueue();
  const first = await enqueueManualForUser(queue, "user-1", new Date("2026-08-17T14:00:00.000Z"));
  const second = await enqueueManualForUser(queue, "user-1", new Date("2026-08-17T14:00:01.000Z"));
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.job.id, first.job.id);

  const before = await queue.getStatus();
  const next = statusAfterManualEnqueue(before, second);
  assert.equal(next.activeJob?.id, first.job.id);
  assert.equal(settingsStatusLabel(next), "Queued");
  assert.equal(canQueueManualSync(next), false);
});
