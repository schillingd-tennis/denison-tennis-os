"use client";

import { useState } from "react";

import { typeRole } from "@/components/typography";
import { deletePersonAction } from "@/features/people/personLifecycleActions";

const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control border border-danger/40 bg-danger/10 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Delete Person confirmation body (BP-041).
 * Distinct from Remove from Family — this permanently deletes the Person record.
 * Destructive confirm lives in content (same drawer pattern as Add Parent submit).
 */
export default function DeletePersonConfirm({
  personId,
  personName,
  onSuccess,
}: {
  personId: string;
  personName: string;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(undefined);
    try {
      const result = await deletePersonAction(personId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className={typeRole.metadata}>
        This permanently deletes{" "}
        <span className="font-medium text-text-primary">{personName}&apos;s</span> record and
        removes any family relationship links involving them. Other People will not be deleted.
      </p>
      <p className={typeRole.metadata}>
        This is not the same as Remove from Family, which only unlinks a parent without
        deleting anyone.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        className={dangerButtonClass}
        disabled={deleting}
        onClick={() => void handleDelete()}
      >
        {deleting ? "Deleting…" : "DELETE PERSON"}
      </button>
    </div>
  );
}
