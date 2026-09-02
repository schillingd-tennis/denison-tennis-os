"use client";

import { useState } from "react";

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
        Delete <span className="font-semibold">{displayOpponentOrEvent(event)}</span> from the schedule? This cannot be
        undone.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="h-9 rounded-control border border-border px-3 text-xs font-semibold" onClick={onCancelled}>
          Cancel
        </button>
        <button
          type="button"
          disabled={deleting}
          className="h-9 rounded-control bg-red-700 px-3 text-xs font-semibold text-white disabled:opacity-50"
          onClick={confirmDelete}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
