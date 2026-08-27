"use client";

import { Loader2 } from "lucide-react";

import "./interactionsHeaderActions.css";

export default function InteractionsSyncMessagesButton({
  disabled,
  live,
  pending,
  notice,
  error,
  hosted,
  onQueue,
}: {
  disabled: boolean;
  live: boolean;
  pending: boolean;
  notice: string | null;
  error: string | null;
  hosted: boolean;
  onQueue: () => void;
}) {
  const busy = hosted && (live || pending);
  const label = busy ? "Syncing…" : notice ?? "Sync Messages";
  return (
    <button
      type="button"
      onClick={onQueue}
      disabled={disabled}
      data-interactions-sync-messages=""
      data-interactions-sync-host={hosted ? "production" : "local"}
      title={hosted ? "Queues a scan on this Mac. This can take up to five minutes." : "Available in production"}
      aria-label="Sync Messages"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {label}
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </button>
  );
}
