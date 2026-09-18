"use client";

import { Loader2 } from "lucide-react";

import "./interactionsHeaderActions.css";

export default function InteractionsSyncWhatsAppButton({
  disabled,
  pending,
  notice,
  error,
  hosted,
  onQueue,
}: {
  disabled: boolean;
  pending: boolean;
  notice: string | null;
  error: string | null;
  hosted: boolean;
  onQueue: () => void;
}) {
  const label = pending ? "Syncing…" : notice ?? "Sync WhatsApp";
  return (
    <button
      type="button"
      onClick={onQueue}
      disabled={disabled}
      data-interactions-sync-whatsapp=""
      data-interactions-sync-host={hosted ? "hosted" : "blocked"}
      title={
        hosted
          ? "Queues WhatsApp import via the Mac helper (production Supabase)."
          : "Available when the app points at production Supabase"
      }
      aria-label="Sync WhatsApp"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {label}
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </button>
  );
}
