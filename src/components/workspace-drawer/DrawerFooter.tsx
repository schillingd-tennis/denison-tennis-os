import type { ReactNode } from "react";

/**
 * BP-034A — Sticky footer for Cancel + primary action.
 * Always visible at the bottom of the drawer panel.
 */
export default function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border/80 bg-surface px-5 py-3.5">
      {children}
    </footer>
  );
}

export function DrawerFooterActions({
  cancelLabel = "Cancel",
  onCancel,
  primaryLabel,
  onPrimary,
  primaryDisabled,
}: {
  cancelLabel?: string;
  onCancel: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-10 items-center justify-center rounded-control border border-border px-4 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-text-secondary/60"
      >
        {cancelLabel}
      </button>
      {primaryLabel ? (
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="inline-flex h-10 items-center justify-center rounded-control bg-denison-red px-4 text-sm font-medium text-surface transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {primaryLabel}
        </button>
      ) : null}
    </>
  );
}
