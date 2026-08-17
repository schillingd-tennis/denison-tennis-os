"use client";

import { Pencil } from "lucide-react";
import type { ReactNode } from "react";

import type { FormMode, SaveStatus } from "./types";

export default function EditorToolbar({
  mode,
  isDirty,
  saveStatus,
  saveError,
  onEdit,
  onCancel,
  onSave,
}: {
  mode: FormMode;
  isDirty: boolean;
  /** Save lifecycle (BP-017 Phase 1); defaults to "idle" for callers that don't persist. */
  saveStatus?: SaveStatus;
  saveError?: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (mode === "view") {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="flex h-10 items-center justify-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-[var(--module-accent)] hover:text-[var(--module-accent)]"
      >
        <Pencil className="h-4 w-4" strokeWidth={1.75} />
        Edit
      </button>
    );
  }

  const isSaving = saveStatus === "saving";

  let statusMessage: ReactNode = null;
  if (saveStatus === "error") {
    statusMessage = (
      <span className="text-xs font-medium text-danger">{saveError ?? "Save failed. Please try again."}</span>
    );
  } else if (isSaving) {
    statusMessage = <span className="text-xs text-text-secondary">Saving…</span>;
  } else if (saveStatus === "saved") {
    statusMessage = <span className="text-xs font-medium text-success">Saved</span>;
  } else if (isDirty) {
    statusMessage = <span className="text-xs text-text-secondary">You have unsaved changes.</span>;
  }

  return (
    <div className="flex items-center gap-3">
      {statusMessage}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 items-center justify-center rounded-control border border-border px-4 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-text-secondary/60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="flex h-10 items-center justify-center rounded-control bg-[var(--module-accent)] px-4 text-sm font-medium text-surface transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
