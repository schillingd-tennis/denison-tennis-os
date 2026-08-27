"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  getAppleMessagesSyncStatusAction,
  queueAppleMessagesSyncAction,
} from "@/features/interactions/appleMessagesSync/actions";
import type { SyncStatus } from "@/features/interactions/appleMessagesSync/ports";
import {
  canQueueManualSync,
  settingsStatusLabel,
  statusAfterManualEnqueue,
} from "@/features/interactions/appleMessagesSync/settingsStatus";

const POLL_MS = 3_000;
const POLL_LIMIT_MS = 5 * 60_000;
const SUCCESS_NOTICE_MS = 5_000;

export function completedImportNotice(status: SyncStatus): string {
  const count = status.lastCompleted?.importedCount;
  if (count == null || count === 0) return "Synced · 0 new";
  return `Synced · ${count} new`;
}

export function failedImportNotice(status: SyncStatus): string {
  const code = status.lastFinished?.errorCode;
  return code ? `Sync failed (${code}).` : "Sync failed.";
}

export function useAppleMessagesManualSync(input: {
  initialStatus: SyncStatus;
  initialError: string | null;
  signedIn: boolean;
  hosted: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(input.initialStatus);
  const [error, setError] = useState<string | null>(input.initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const watchedId = useRef<string | null>(input.hosted ? input.initialStatus.activeJob?.id ?? null : null);
  const live = input.hosted && (!canQueueManualSync(status) || pending);
  const disabled = !input.hosted || live;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), SUCCESS_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!live || !input.hosted) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > POLL_LIMIT_MS) {
        window.clearInterval(timer);
        return;
      }
      void (async () => {
        const latest = await getAppleMessagesSyncStatusAction();
        if (!latest.ok) {
          setError(latest.error);
          return;
        }
        setStatus(latest.status);
        if (!canQueueManualSync(latest.status) || !watchedId.current) return;
        if (latest.status.lastFinished?.status === "failed") {
          setError(failedImportNotice(latest.status));
          return;
        }
        setNotice(completedImportNotice(latest.status));
        router.refresh();
      })();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [input.hosted, live, router]);

  function queueSync() {
    if (disabled) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const queued = await queueAppleMessagesSyncAction();
      if (!queued.ok) {
        setError(queued.error);
        return;
      }
      watchedId.current = queued.result.job.id;
      setStatus((current) => statusAfterManualEnqueue(current, queued.result));
      const latest = await getAppleMessagesSyncStatusAction();
      if (latest.ok) setStatus(latest.status);
      else setError(latest.error);
    });
  }

  return {
    status,
    error,
    notice,
    live,
    disabled,
    pending,
    hosted: input.hosted,
    statusLabel: settingsStatusLabel(status),
    queueSync,
  };
}
