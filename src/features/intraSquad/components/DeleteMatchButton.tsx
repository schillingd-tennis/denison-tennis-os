"use client";

import { Trash2 } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";

import type { IntraSquadMatch } from "../types";

function stopRow(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

export default function DeleteMatchButton({
  match,
  onDelete,
}: {
  match: IntraSquadMatch;
  onDelete: (match: IntraSquadMatch) => void;
}) {
  return (
    <button
      type="button"
      data-intra-squad-delete-match=""
      aria-label="Delete match"
      title="Delete match"
      onClick={(event) => {
        stopRow(event);
        onDelete(match);
      }}
      onMouseDown={stopRow}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") stopRow(event);
      }}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
    </button>
  );
}
