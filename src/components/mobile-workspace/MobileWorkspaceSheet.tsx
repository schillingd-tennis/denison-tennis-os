"use client";

import { Check, X, type LucideIcon } from "lucide-react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

export type MobileWorkspaceItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Optional meta lines under the title (same scan role as desktop nav). */
  lines?: readonly string[];
};

/**
 * OS-wide mobile workspace picker sheet.
 * Lists available Adaptive Workspaces; selection is owned by the parent.
 */
export default function MobileWorkspaceSheet({
  open,
  onClose,
  items,
  activeId,
  onSelect,
  title = "Workspaces",
}: {
  open: boolean;
  onClose: () => void;
  items: readonly MobileWorkspaceItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  title?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-mobile-workspace-sheet=""
    >
      <button
        type="button"
        aria-label="Close workspaces"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-card bg-surface shadow-[0_-12px_40px_rgba(17,24,39,0.12)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close workspaces"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-control text-text-secondary hover:bg-app-background hover:text-text-primary"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-2 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="listbox"
          aria-label={title}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const selected = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={[
                  "flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "bg-[var(--module-tint)]/50 font-semibold text-[var(--module-accent)]"
                    : "font-medium text-text-secondary hover:bg-app-background hover:text-text-primary",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control",
                    selected
                      ? "bg-[var(--module-tint)] text-[var(--module-accent)]"
                      : "bg-app-background text-text-secondary",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] tracking-tight text-text-primary">
                    {item.title}
                  </span>
                  {item.lines && item.lines.length > 0 ? (
                    <span className="mt-0.5 block space-y-px">
                      {item.lines.map((line) => (
                        <span
                          key={line}
                          className="block truncate text-[12.5px] leading-snug text-text-secondary"
                        >
                          {line}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                {selected ? (
                  <Check className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
