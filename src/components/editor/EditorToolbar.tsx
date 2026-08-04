"use client";

import { Pencil } from "lucide-react";

import type { FormMode } from "./types";

export default function EditorToolbar({
  mode,
  isDirty,
  onEdit,
  onCancel,
  onSave,
}: {
  mode: FormMode;
  isDirty: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (mode === "view") {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="flex h-10 items-center justify-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-denison-red hover:text-denison-red"
      >
        <Pencil className="h-4 w-4" strokeWidth={1.75} />
        Edit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {isDirty ? <span className="text-xs text-text-secondary">You have unsaved changes.</span> : null}
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
          disabled={!isDirty}
          className="flex h-10 items-center justify-center rounded-control bg-denison-red px-4 text-sm font-medium text-surface transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
