"use client";

import { useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";

import {
  getAppleMessagesSyncStatusAction,
  queueAppleMessagesSyncAction,
} from "./actions";
import type { SyncStatus } from "./ports";
import {
  CONNECTION_DESCRIPTION,
  canQueueManualSync,
  formatLastSuccessfulSync,
  latestImportedCountLabel,
  nightlyScheduleLabel,
  settingsStatusLabel,
  statusAfterManualEnqueue,
} from "./settingsStatus";

export type AppleMessagesSettingsCardProps = {
  initialStatus: SyncStatus;
  initialError?: string | null;
  signedIn: boolean;
};

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-sm text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-text-primary sm:text-right">{value}</dd>
    </div>
  );
}

export default function AppleMessagesSettingsCard({
  initialStatus,
  initialError = null,
  signedIn,
}: AppleMessagesSettingsCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();
  const live = !canQueueManualSync(status);
  const disabled = !signedIn || live || pending;

  function queueSync() {
    if (disabled) return;
    setError(null);
    startTransition(async () => {
      const queued = await queueAppleMessagesSyncAction();
      if (!queued.ok) {
        setError(queued.error);
        return;
      }
      setStatus((current) => statusAfterManualEnqueue(current, queued.result));
      const latest = await getAppleMessagesSyncStatusAction();
      if (latest.ok) setStatus(latest.status);
      else setError(latest.error);
    });
  }

  return (
    <section aria-labelledby="apple-messages-integrations-heading">
      <h2
        id="apple-messages-integrations-heading"
        className="text-sm font-semibold tracking-wide text-text-secondary uppercase"
      >
        Integrations
      </h2>
      <div className="mt-3 rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-control bg-app-background text-text-secondary">
            <MessageSquare className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">Apple Messages</p>
            <p className="mt-1 text-sm text-text-secondary">{CONNECTION_DESCRIPTION}</p>
          </div>
        </div>

        <dl className="mt-4">
          <StatusRow label="Nightly schedule" value={nightlyScheduleLabel()} />
          <StatusRow
            label="Last successful sync"
            value={formatLastSuccessfulSync(status.lastCompleted?.finishedAt)}
          />
          <StatusRow label="Current status" value={settingsStatusLabel(status)} />
          <StatusRow
            label="New interactions imported"
            value={latestImportedCountLabel(status)}
          />
        </dl>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={queueSync}
            disabled={disabled}
            className={`inline-flex h-10 items-center justify-center rounded-control border px-3.5 text-sm font-medium transition-colors ${
              disabled
                ? "cursor-not-allowed border-border bg-app-background text-text-secondary/50"
                : "border-border bg-surface text-text-primary hover:border-text-secondary/40 hover:bg-app-background"
            }`}
          >
            Sync Messages
          </button>
          {live ? (
            <p className="text-sm text-text-secondary">
              A sync is already {settingsStatusLabel(status).toLowerCase()}. Repeat clicks keep that
              job.
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
