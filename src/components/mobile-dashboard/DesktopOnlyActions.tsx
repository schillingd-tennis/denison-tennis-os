import type { ReactNode } from "react";

/**
 * Hides Copy / Export (and similar) found-set actions below `md` while keeping
 * them in the desktop action cluster via `display: contents`.
 */
export default function DesktopOnlyActions({ children }: { children: ReactNode }) {
  return <div className="hidden md:contents">{children}</div>;
}
