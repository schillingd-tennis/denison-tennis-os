"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";

import {
  enableWhatsAppForwardOnlyAction,
  getWhatsAppSyncStatusAction,
  queueWhatsAppSyncAction,
} from "./actions";
import {
  CONNECTION_DESCRIPTION,
  connectionStateLabel,
  formatTimestamp,
  helperOnlineLabel,
  type WhatsAppUiStatus,
} from "./settingsStatus";

export type WhatsAppSettingsCardProps = {
  initialStatus: WhatsAppUiStatus;
  initialError?: string | null;
  signedIn: boolean;
  /** Production hosted sync (queue jobs). */
  hostedSync: boolean;
  /** Local Mac sqlite status path. */
  localMacStatus?: boolean;
};

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-sm text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-text-primary sm:text-right">{value}</dd>
    </div>
  );
}

export default function WhatsAppSettingsCard({
  initialStatus,
  initialError = null,
  signedIn,
  hostedSync,
  localMacStatus = false,
}: WhatsAppSettingsCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(initialError);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const syncAvailable = hostedSync || localMacStatus;
  const disabled = !signedIn || !syncAvailable || pending;

  function refresh() {
    startTransition(async () => {
      const latest = await getWhatsAppSyncStatusAction();
      if (latest.ok) setStatus(latest.status);
      else setError(latest.error);
    });
  }

  function queueSync() {
    if (disabled) return;
    setError(null);
    setHint(null);
    startTransition(async () => {
      const queued = await queueWhatsAppSyncAction();
      if (!queued.ok) {
        setError(queued.error);
        return;
      }
      setStatus(queued.status);
      setHint(queued.hint);
      const latest = await getWhatsAppSyncStatusAction();
      if (latest.ok) setStatus(latest.status);
    });
  }

  function enableForwardOnly() {
    if (!localMacStatus || pending) return;
    setError(null);
    setHint(null);
    startTransition(async () => {
      const result = await enableWhatsAppForwardOnlyAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus(result.status);
      setHint(
        result.status.importFromAt
          ? `Forward-only enabled. Start importing from ${formatTimestamp(result.status.importFromAt)} (local time).`
          : "Forward-only enabled.",
      );
    });
  }

  return (
    <section aria-labelledby="whatsapp-integrations-heading" className="mt-6">
      <div className="rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-control bg-app-background text-text-secondary">
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">WhatsApp</p>
            <p className="mt-1 text-sm text-text-secondary">{CONNECTION_DESCRIPTION}</p>
          </div>
        </div>

        <dl className="mt-4">
          <StatusRow label="Helper" value={helperOnlineLabel(status.helperOnline)} />
          <StatusRow label="Connection" value={connectionStateLabel(status.connectionState)} />
          <StatusRow
            label="Destination"
            value={status.destinationHost ?? (hostedSync ? "—" : "local")}
          />
          <StatusRow
            label="Start importing from"
            value={
              status.importFromAt
                ? formatTimestamp(status.importFromAt)
                : "Not set — enable forward-only sync"
            }
          />
          <StatusRow
            label="Production activation"
            value={
              status.productionActivationAt
                ? formatTimestamp(status.productionActivationAt)
                : "Not set"
            }
          />
          <StatusRow label="Last sync" value={formatTimestamp(status.lastSyncAt)} />
          {status.activeJobStatus ? (
            <StatusRow label="Job" value={status.activeJobStatus} />
          ) : null}
          <StatusRow label="Imported" value={String(status.importedCount)} />
          <StatusRow label="Skipped" value={String(status.skippedCount)} />
          <StatusRow label="Unmatched / review" value={String(status.unmatchedCount)} />
          {status.lastErrorCode ? (
            <StatusRow label="Last error" value={status.lastErrorCode} />
          ) : null}
        </dl>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {localMacStatus && !status.importFromAt ? (
              <button
                type="button"
                onClick={enableForwardOnly}
                disabled={disabled}
                className={`inline-flex h-10 items-center justify-center rounded-control border px-3.5 text-sm font-medium transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-border bg-app-background text-text-secondary/50"
                    : "border-border bg-surface text-text-primary hover:border-text-secondary/40 hover:bg-app-background"
                }`}
              >
                Enable forward-only sync
              </button>
            ) : null}
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
              Sync WhatsApp
            </button>
            <button
              type="button"
              onClick={refresh}
              disabled={!signedIn || pending}
              className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-3.5 text-sm font-medium text-text-primary hover:border-text-secondary/40 hover:bg-app-background disabled:cursor-not-allowed disabled:text-text-secondary/50"
            >
              Refresh status
            </button>
          </div>
          {!syncAvailable ? (
            <p className="text-sm text-text-secondary">
              Available when the app points at production Supabase (or local for Mac helper).
            </p>
          ) : null}
        </div>
        {hint ? <p className="mt-3 text-sm text-text-secondary">{hint}</p> : null}
        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-text-secondary">
          Live: <code className="text-text-primary">npm run whatsapp-helper -- --enable-live-destination</code>
          {" · "}
          Tick: <code className="text-text-primary">npm run whatsapp-helper -- --tick</code>
          {" · "}
          Cutoff is never reset automatically. Production activation is set once on enable.
        </p>
      </div>
    </section>
  );
}
