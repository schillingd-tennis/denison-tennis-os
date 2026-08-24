import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_LEASE_MS,
  JobQueueError,
  createMemoryJobQueue,
  enqueueManualForUser,
  readStatusForUser,
} from "./jobQueue";

const USER = "user-1";

test("authenticated enqueue creates a manual queued job", async () => {
  const queue = createMemoryJobQueue();
  const now = new Date("2024-06-15T12:00:00.000Z");
  const result = await queue.enqueueManual(USER, now);
  assert.equal(result.created, true);
  assert.equal(result.job.trigger, "manual");
  assert.equal(result.job.status, "queued");
  assert.equal(result.job.requestedBy, USER);
  assert.equal(result.job.importedCount, null);
  assert.equal(result.job.errorCode, null);
  assert.equal(JSON.stringify(result.job).includes("hello from iMessage"), false);
});

test("duplicate click returns the existing active job", async () => {
  const queue = createMemoryJobQueue();
  const first = await queue.enqueueManual(USER, new Date("2024-06-15T12:00:00.000Z"));
  const second = await queue.enqueueManual("user-2", new Date("2024-06-15T12:00:01.000Z"));
  assert.equal(second.created, false);
  assert.equal(second.job.id, first.job.id);
  assert.equal(queue.store.jobs.length, 1);
});

test("status query reports active and last completed jobs", async () => {
  const queue = createMemoryJobQueue();
  const now = new Date("2024-06-15T12:00:00.000Z");
  await queue.enqueueManual(USER, now);
  let status = await queue.getStatus();
  assert.equal(status.activeJob?.status, "queued");
  assert.equal(status.lastCompleted, null);

  const claimed = await queue.claimQueued(now, DEFAULT_LEASE_MS);
  assert.ok(claimed);
  await queue.complete(claimed.id, 4, new Date("2024-06-15T12:05:00.000Z"));
  status = await queue.getStatus();
  assert.equal(status.activeJob, null);
  assert.equal(status.lastCompleted?.importedCount, 4);
  assert.equal(status.lastCompleted?.status, "completed");
});

test("claim assigns a lease and heartbeat extends it", async () => {
  const queue = createMemoryJobQueue();
  const t0 = new Date("2024-06-15T12:00:00.000Z");
  await queue.enqueueManual(USER, t0);
  const claimed = await queue.claimQueued(t0, 60_000);
  assert.equal(claimed?.status, "running");
  assert.equal(claimed?.leaseExpiresAt, "2024-06-15T12:01:00.000Z");
  assert.equal(claimed?.startedAt, t0.toISOString());

  const t1 = new Date("2024-06-15T12:00:30.000Z");
  await queue.heartbeat(claimed!.id, t1, 60_000);
  const running = await queue.store.findById(claimed!.id);
  assert.equal(running?.heartbeatAt, t1.toISOString());
  assert.equal(running?.leaseExpiresAt, "2024-06-15T12:01:30.000Z");
});

test("complete and fail close a running job", async () => {
  const queue = createMemoryJobQueue();
  const t0 = new Date("2024-06-15T12:00:00.000Z");
  await queue.enqueueManual(USER, t0);
  const first = await queue.claimQueued(t0, 60_000);
  await queue.complete(first!.id, 2, new Date("2024-06-15T12:02:00.000Z"));
  const done = await queue.store.findById(first!.id);
  assert.equal(done?.status, "completed");
  assert.equal(done?.importedCount, 2);
  assert.equal(done?.leaseExpiresAt, null);

  await queue.enqueueManual(USER, new Date("2024-06-15T13:00:00.000Z"));
  const second = await queue.claimQueued(new Date("2024-06-15T13:00:00.000Z"), 60_000);
  await queue.fail(second!.id, "decode_failed", new Date("2024-06-15T13:01:00.000Z"));
  const failed = await queue.store.findById(second!.id);
  assert.equal(failed?.status, "failed");
  assert.equal(failed?.errorCode, "decode_failed");
});

test("expired lease recovery marks the job failed so a new sync can start", async () => {
  const queue = createMemoryJobQueue();
  const t0 = new Date("2024-06-15T12:00:00.000Z");
  await queue.enqueueManual(USER, t0);
  const claimed = await queue.claimQueued(t0, 60_000);
  assert.ok(claimed);

  const tExpired = new Date("2024-06-15T12:05:00.000Z");
  const reaped = await queue.failExpiredLeases(tExpired);
  assert.equal(reaped, 1);
  const expired = await queue.store.findById(claimed!.id);
  assert.equal(expired?.status, "failed");
  assert.equal(expired?.errorCode, "lease_expired");

  const next = await queue.enqueueManual(USER, tExpired);
  assert.equal(next.created, true);
  assert.notEqual(next.job.id, claimed.id);
  const claimedNext = await queue.claimQueued(tExpired, 60_000);
  assert.equal(claimedNext?.status, "running");
});

test("single-flight: only one queued or running job exists", async () => {
  const queue = createMemoryJobQueue();
  const t0 = new Date("2024-06-15T12:00:00.000Z");
  const first = await queue.enqueueManual(USER, t0);
  await queue.claimQueued(t0, 60_000);
  const duplicate = await queue.enqueueManual("someone-else", new Date("2024-06-15T12:00:05.000Z"));
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.job.id, first.job.id);
  assert.equal(queue.store.jobs.filter((job) => job.status === "queued" || job.status === "running").length, 1);
  const secondClaim = await queue.claimQueued(new Date("2024-06-15T12:00:10.000Z"), 60_000);
  assert.equal(secondClaim, null);
});

test("status reports lastFinished so Settings can show Failed after a helper error", async () => {
  const queue = createMemoryJobQueue();
  const t0 = new Date("2024-06-15T12:00:00.000Z");
  await queue.enqueueManual(USER, t0);
  const claimed = await queue.claimQueued(t0, DEFAULT_LEASE_MS);
  await queue.fail(claimed!.id, "lease_expired", new Date("2024-06-15T12:02:00.000Z"));
  const status = await queue.getStatus();
  assert.equal(status.activeJob, null);
  assert.equal(status.lastCompleted, null);
  assert.equal(status.lastFinished?.status, "failed");
  assert.equal(status.lastFinished?.errorCode, "lease_expired");
});

test("queue and status actions require an authenticated user", async () => {
  const queue = createMemoryJobQueue();
  await assert.rejects(() => enqueueManualForUser(queue, null), (error: unknown) => error instanceof JobQueueError);
  await assert.rejects(() => readStatusForUser(queue, null), (error: unknown) => error instanceof JobQueueError);
  const result = await enqueueManualForUser(queue, USER, new Date("2024-06-15T12:00:00.000Z"));
  assert.equal(result.created, true);
  const status = await readStatusForUser(queue, USER);
  assert.equal(status.activeJob?.id, result.job.id);
});

test("helper-owned scheduled jobs enqueue without a user id", async () => {
  const queue = createMemoryJobQueue();
  const now = new Date("2026-08-17T23:00:00.000Z");
  const scheduled = await queue.enqueueTriggered("scheduled", now);
  assert.equal(scheduled.created, true);
  assert.equal(scheduled.job.trigger, "scheduled");
  assert.equal(scheduled.job.requestedBy, null);
});
