import type { ReactNode } from "react";

/**
 * BP-034A — Scrollable drawer content region.
 * Footer stays sticky outside this element.
 */
export default function DrawerBody({ children }: { children: ReactNode }) {
  return (
    <div
      data-workspace-drawer-scroll=""
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
    >
      {children}
    </div>
  );
}
