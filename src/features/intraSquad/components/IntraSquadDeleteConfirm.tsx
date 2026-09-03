"use client";

import { useState } from "react";

import { formatDate } from "@/lib/formatting";

import { deleteIntraSquadMatchAction } from "../actions";
import { formatMatchHeadline } from "../records";
import type { IntraSquadMatch, RosterPlayer } from "../types";

export default function IntraSquadDeleteConfirm({
  match,
  roster,
  onCancelled,
  onDeleted,
}: {
  match: IntraSquadMatch;
  roster: RosterPlayer[];
  onCancelled: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    const result = await deleteIntraSquadMatchAction(match.id);
    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    onDeleted(match.id);
  }

  return (
    <div data-intra-squad-delete-confirm="" className="space-y-4 p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-text-primary">Delete Match?</p>
        <p className="text-sm text-text-primary">
          {formatMatchHeadline(match, roster)}
        </p>
        <p className="text-sm tabular-nums text-text-primary">{match.scoreText}</p>
        <p className="text-xs text-text-secondary">{formatDate(match.playedAt)}</p>
        <p className="text-sm text-text-secondary">
          This will remove the result from both players’ records and recalculate rankings.
        </p>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-intra-squad-delete-cancel=""
          className="h-9 rounded-control border border-border px-3 text-xs font-semibold"
          onClick={onCancelled}
        >
          Cancel
        </button>
        <button
          type="button"
          data-intra-squad-delete-confirm-button=""
          disabled={deleting}
          className="h-9 rounded-control bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          onClick={confirmDelete}
        >
          {deleting ? "Deleting…" : "Delete Match"}
        </button>
      </div>
    </div>
  );
}
