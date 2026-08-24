import { EMPTY_VALUE, formatDate, formatTime } from "@/lib/formatting";

import { SCHEDULED_HOUR, SCHEDULED_MINUTE } from "./schedule";
import type { EnqueueResult, SyncJob, SyncStatus } from "./ports";

export const CONNECTION_DESCRIPTION = "Sync runs from this Mac.";

export type SettingsStatusLabel = "Idle" | "Queued" | "Running" | "Completed" | "Failed";

export function nightlyScheduleLabel(): string {
  return formatTime(new Date(2026, 0, 1, SCHEDULED_HOUR, SCHEDULED_MINUTE));
}

export function isLiveSyncJob(job: SyncJob | null | undefined): boolean {
  return job?.status === "queued" || job?.status === "running";
}

export function canQueueManualSync(status: SyncStatus): boolean {
  return !isLiveSyncJob(status.activeJob);
}

export function settingsStatusLabel(status: SyncStatus): SettingsStatusLabel {
  if (status.activeJob?.status === "queued") return "Queued";
  if (status.activeJob?.status === "running") return "Running";
  if (status.lastFinished?.status === "failed") return "Failed";
  if (status.lastFinished?.status === "completed") return "Completed";
  return "Idle";
}

export function formatLastSuccessfulSync(finishedAt: string | null | undefined): string {
  if (!finishedAt) return EMPTY_VALUE;
  const date = formatDate(finishedAt);
  const time = formatTime(finishedAt);
  if (date === EMPTY_VALUE) return EMPTY_VALUE;
  return `${date}, ${time}`;
}

export function latestImportedCountLabel(status: SyncStatus): string {
  const count = status.lastCompleted?.importedCount;
  if (count == null) return EMPTY_VALUE;
  return String(count);
}

export function statusAfterManualEnqueue(status: SyncStatus, result: EnqueueResult): SyncStatus {
  const live = isLiveSyncJob(result.job);
  return {
    ...status,
    activeJob: live ? result.job : status.activeJob,
  };
}

export function emptySyncStatus(): SyncStatus {
  return { activeJob: null, lastCompleted: null, lastFinished: null };
}
