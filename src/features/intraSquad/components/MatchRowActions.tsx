"use client";

import { Pencil } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";

import type { IntraSquadMatch } from "../types";
import DeleteMatchButton from "./DeleteMatchButton";

function stopRow(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

export default function MatchRowActions({
  match,
  onEdit,
  onDelete,
  showEdit = false,
}: {
  match: IntraSquadMatch;
  onEdit?: (match: IntraSquadMatch) => void;
  onDelete?: (match: IntraSquadMatch) => void;
  showEdit?: boolean;
}) {
  if (!onDelete && !showEdit) return null;

  return (
    <div
      data-intra-squad-row-actions=""
      className="flex shrink-0 items-center justify-end gap-0.5"
      onClick={stopRow}
      onMouseDown={stopRow}
    >
      {showEdit && onEdit ? (
        <button
          type="button"
          data-intra-squad-edit-match=""
          aria-label="Edit match"
          title="Edit match"
          onClick={(event) => {
            stopRow(event);
            onEdit(match);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-control text-text-secondary hover:bg-black/[0.04] hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--module-accent)]"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
      {onDelete ? <DeleteMatchButton match={match} onDelete={onDelete} /> : null}
    </div>
  );
}
