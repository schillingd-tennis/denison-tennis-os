import type { ReactNode } from "react";

/**
 * Hide large KPI / summary card rows below `md`. Desktop (`md+`) is the
 * default (`block`); mobile uses `max-md:hidden`.
 *
 * Do not use `hidden md:block` — if `md:block` is not generated, the section
 * stays `display: none` on desktop.
 */
export default function DesktopOnlySummary({ children }: { children: ReactNode }) {
  return <div className="max-md:hidden">{children}</div>;
}
