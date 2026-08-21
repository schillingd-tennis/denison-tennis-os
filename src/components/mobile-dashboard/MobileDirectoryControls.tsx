import type { ReactNode } from "react";

/**
 * OS-wide mobile directory toolbar row: View + Filters side-by-side.
 * Desktop (`md+`) does not render this — callers keep ViewToggle + facet chips.
 */
export default function MobileDirectoryControls({
  children,
}: {
  /** Typically `[MobileViewSelector, MobileFiltersButton]`. */
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:hidden [&>*]:min-w-0">
      {children}
    </div>
  );
}
