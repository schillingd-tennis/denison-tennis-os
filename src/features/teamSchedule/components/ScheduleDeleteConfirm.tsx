"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { findMatchEventLinkedToSchedule } from "@/features/matches/actions";
import { matchesEventPath } from "@/lib/module-routes";

import { deleteScheduleEventAction } from "../actions";
import { displayOpponentOrEvent, type TeamScheduleEvent } from "../types";

export default function ScheduleDeleteConfirm({
  event,
  onCancelled,
  onDeleted,
}: {
  event: TeamScheduleEvent;
  onCancelled: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedMatchId, setLinkedMatchId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const linked = await findMatchEventLinkedToSchedule(event.id);
        if (!cancelled) setLinkedMatchId(linked?.id ?? null);
      } catch {
        if (!cancelled) setLinkedMatchId(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteScheduleEventAction(event.id);
    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    onDeleted(event.id);
  }

  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-text-primary">
        Delete <span className="font-semibold">{displayOpponentOrEvent(event)}</span> from the schedule?
        This cannot be undone.
      </p>
      {checking ? (
        <p className="text-xs text-text-secondary">Checking for linked official results…</p>
      ) : linkedMatchId ? (
        <div className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="font-medium">Official Matches results are linked</p>
          <p className="mt-1">
            Deleting this Schedule event will <span className="font-medium">not</span> delete official
            results. The Matches container will be unlinked and archived with its snapshot identity.
          </p>
          <Link
            href={matchesEventPath(linkedMatchId)}
            className="mt-2 inline-block font-medium text-[var(--module-accent)] hover:underline"
          >
            Review Official Results first
          </Link>
        </div>
      ) : (
        <p className="text-xs text-text-secondary">No official Matches results are linked to this event.</p>
      )}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="h-9 rounded-control border border-border px-3 text-xs font-semibold"
          onClick={onCancelled}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={deleting || checking}
          className="h-9 rounded-control bg-red-700 px-3 text-xs font-semibold text-white disabled:opacity-50"
          onClick={confirmDelete}
        >
          {deleting ? "Deleting…" : linkedMatchId ? "Delete Schedule (keep results)" : "Delete"}
        </button>
      </div>
    </div>
  );
}
