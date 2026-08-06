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
  children,
  mobile,
}: {
  /** Desktop table (typically a full `<table>`). */
  children: ReactNode;
  /** Optional stacked mobile list rendered below `md`. */
  mobile?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-surface">
      {/*
        Scrollport for sticky Name / Actions (BP-028C).
        Do not wrap children in min-w-full — that prevents overflow and
        disables position:sticky on the edge columns.
      */}
      <div className="hidden overflow-x-auto md:block">{children}</div>
      {mobile ? <div className="md:hidden">{mobile}</div> : null}
    </div>
  );
}
