"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deletePlayerMatchResultAction } from "../playerRecordActions";

export default function DeleteMatchResultButton({ resultId, eventId }: {
  resultId: string;
  eventId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Delete this match result? This also removes it from player records and cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deletePlayerMatchResultAction({ resultId, eventId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not delete this result.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={remove} disabled={busy} aria-label="Delete match result"
        className="inline-flex h-8 items-center justify-center rounded-control border border-red-200 bg-surface px-2.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50">
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error ? <span role="alert" className="max-w-48 text-xs font-normal text-red-700">{error}</span> : null}
    </span>
  );
}
