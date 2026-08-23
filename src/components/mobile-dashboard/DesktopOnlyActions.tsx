import type { ReactNode } from "react";

/**
 * Hide Copy / Export (and similar) found-set actions below `md`. Desktop
 * uses `contents` so buttons stay in the existing action cluster.
 *
 * Do not use `hidden md:contents` — if `md:contents` is not generated, the
 * actions stay `display: none` on desktop.
 */
export default function DesktopOnlyActions({ children }: { children: ReactNode }) {
  return <div className="contents max-md:hidden">{children}</div>;
}
