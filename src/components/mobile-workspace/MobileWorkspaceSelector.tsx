"use client";

import { ChevronDown, LayoutPanelLeft } from "lucide-react";
import { useState } from "react";

import MobileWorkspaceSheet, {
  type MobileWorkspaceItem,
} from "./MobileWorkspaceSheet";

/**
 * OS-wide mobile Adaptive Workspace selector.
 * Desktop keeps the BP-036D split rail; this is `md:hidden` only.
 */
export default function MobileWorkspaceSelector({
  items,
  activeId,
  onSelect,
  ariaLabel = "Change workspace",
  triggerLabel = "Workspace",
  sheetTitle = "Workspaces",
}: {
  items: readonly MobileWorkspaceItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  triggerLabel?: string;
  sheetTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = items.find((item) => item.id === activeId) ?? null;
  const CurrentIcon = current?.icon;

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-surface px-3.5 text-[13px] font-medium text-text-secondary ring-1 ring-black/[0.06]"
      >
        {CurrentIcon ? (
          <CurrentIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        ) : (
          <LayoutPanelLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        )}
        <span className="min-w-0 truncate">
          {triggerLabel}
          {current ? `: ${current.title}` : ""}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} aria-hidden />
      </button>
      <MobileWorkspaceSheet
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        activeId={activeId}
        onSelect={onSelect}
        title={sheetTitle}
      />
    </div>
  );
}
