import type { ReactNode } from "react";

/**
 * Shared directory table shell (BP-025D / BP-028A).
 *
 * Horizontal scroll container for Team-style directories. Apply sticky edge
 * column classes from `stickyColumns.ts`:
 * - leading (Name) on the left
 * - trailing (Actions) on the right
 * Middle columns scroll between them.
 */
export default function DirectoryTable({
  minWidthClassName = "min-w-full",
  children,
  mobile,
}: {
  /** Ensures horizontal scroll when columns exceed the viewport. */
  minWidthClassName?: string;
  /** Desktop table (typically a full `<table>`). */
  children: ReactNode;
  /** Optional stacked mobile list rendered below `md`. */
  mobile?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-surface">
      <div className="hidden overflow-x-auto md:block">
        <div className={minWidthClassName}>{children}</div>
      </div>
      {mobile ? <div className="md:hidden">{mobile}</div> : null}
    </div>
  );
}
