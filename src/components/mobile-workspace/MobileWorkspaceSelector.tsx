"use client";

import { ChevronDown, LayoutPanelLeft } from "lucide-react";
import { useState } from "react";

import MobileWorkspaceSheet, {
  type MobileWorkspaceItem,
} from "./MobileWorkspaceSheet";

/**
 * OS-wide mobile Adaptive Workspace selector.
 * Desktop keeps the BP-036D split rail; this is `md:hidden` only.
 *
 * Visual language: a quiet module-tinted navigation control — noticeable
 * as interactive, not a primary CTA. Tokens follow the active module
 * (Recruiting: Denison red/pink; Team: team blue).
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
        className="inline-flex h-11 w-full items-center gap-2.5 rounded-control bg-[var(--module-tint)] px-3 text-left ring-1 ring-[var(--module-border)]"
      >
        {CurrentIcon ? (
          <CurrentIcon
            className="h-4 w-4 shrink-0 text-[var(--module-accent)]"
            strokeWidth={1.75}
            aria-hidden
          />
        ) : (
          <LayoutPanelLeft
            className="h-4 w-4 shrink-0 text-[var(--module-accent)]"
            strokeWidth={1.75}
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 truncate">
          <span className="text-[12px] font-medium text-text-secondary">{triggerLabel}: </span>
          <span className="text-[13px] font-semibold text-text-primary">
            {current?.title ?? "Select"}
          </span>
        </span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--module-accent)]/10"
          aria-hidden
        >
          <ChevronDown
            className="h-3.5 w-3.5 text-[var(--module-accent)]"
            strokeWidth={2}
          />
        </span>
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
