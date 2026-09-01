"use client";

import { useState } from "react";

import { formatDate } from "@/lib/formatting";

import { markContactTextSentAction } from "../actions";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export default function MarkTextSentConfirm({
  recruitPersonId,
  recruitName,
  messageText,
  matchResultId,
  upcomingTournamentId,
  onSuccess,
  onCancel,
}: {
  recruitPersonId: string;
  recruitName: string;
  messageText: string;
  matchResultId?: string | null;
  upcomingTournamentId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const occurredAtLabel = formatDate(new Date().toISOString()) ?? "Today";

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await markContactTextSentAction({
      recruitPersonId,
      messageText,
      matchResultId: matchResultId ?? null,
      upcomingTournamentId: upcomingTournamentId ?? null,
    });

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-text-secondary">Recruit</dt>
          <dd className="font-medium text-text-primary">{recruitName}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Contact method</dt>
          <dd className="text-text-primary">Text</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Date/time</dt>
          <dd className="text-text-primary">{occurredAtLabel} (now)</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Message</dt>
          <dd className="whitespace-pre-wrap rounded-control border border-border/80 bg-background px-3 py-2 text-text-primary">
            {messageText.trim() || "—"}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-text-secondary">
        This logs an outbound text interaction. No message will be sent from Denison Tennis OS.
      </p>

      {error ? (
        <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-control border border-border px-4 text-sm font-semibold text-text-primary"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={submitting || !messageText.trim()}
          onClick={() => void handleConfirm()}
        >
          {submitting ? "Logging…" : "Confirm Sent"}
        </button>
      </div>
    </div>
  );
}
