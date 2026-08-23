"use client";

import { useState } from "react";

import { typeRole } from "@/components/typography";
import { deleteRecruitInteractionAction } from "../actions";

const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control border border-danger/40 bg-danger/10 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40";

export default function DeleteInteractionConfirm({
  interactionId,
  onSuccess,
  onCancel,
}: {
  interactionId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(undefined);
    try {
      await deleteRecruitInteractionAction(interactionId);
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete interaction.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <p className={typeRole.metadata}>This interaction will be permanently removed.</p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-control border border-border px-4 text-sm font-semibold"
        >
          Cancel
        </button>
        <button type="button" className={dangerButtonClass} disabled={deleting} onClick={() => void handleDelete()}>
          {deleting ? "Deleting…" : "Delete Interaction"}
        </button>
      </div>
    </div>
  );
}
