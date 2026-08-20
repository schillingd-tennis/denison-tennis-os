import type { ReactNode } from "react";

/**
 * OS mobile dashboard pattern: hide large KPI / summary card sections below
 * `md` so search, filters, views, and content lead. Desktop (`md+`) unchanged.
 *
 * Wrap module directory KPI rows — do not stop computing the underlying data.
 */
export default function DesktopOnlySummary({ children }: { children: ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}
