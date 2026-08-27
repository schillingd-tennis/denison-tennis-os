import assert from "node:assert/strict";
import { test } from "node:test";

import { emptySyncStatus } from "@/features/interactions/appleMessagesSync/settingsStatus";
import type { SyncJob, SyncStatus } from "@/features/interactions/appleMessagesSync/ports";

import { completedImportNotice, failedImportNotice } from "./useAppleMessagesManualSync";

function job(partial: Partial<SyncJob> & Pick<SyncJob, "status">): SyncJob {
  return {
    id: "job-1",
    trigger: "manual",
    requestedBy: "user-1",
    requestedAt: "2026-08-27T12:00:00.000Z",
    startedAt: null,
    heartbeatAt: null,
    leaseExpiresAt: null,
    finishedAt: "2026-08-27T12:05:00.000Z",
    importedCount: null,
    errorCode: null,
    ...partial,
  };
}

function status(partial: Partial<SyncStatus>): SyncStatus {
  return { ...emptySyncStatus(), ...partial };
}

test("a completed zero-import job is a successful scan", () => {
  const emptyScan = job({ status: "completed", importedCount: 0 });
  assert.equal(
    completedImportNotice(status({ lastCompleted: emptyScan, lastFinished: emptyScan })),
    "Synced · 0 new",
  );
});

test("a completed import reports the new count", () => {
  const imported = job({ status: "completed", importedCount: 4 });
  assert.equal(
    completedImportNotice(status({ lastCompleted: imported, lastFinished: imported })),
    "Synced · 4 new",
  );
});

test("a failed job uses the existing error code", () => {
  const failed = job({ status: "failed", errorCode: "lease_expired" });
  assert.equal(
    failedImportNotice(status({ lastFinished: failed })),
    "Sync failed (lease_expired).",
  );
});
