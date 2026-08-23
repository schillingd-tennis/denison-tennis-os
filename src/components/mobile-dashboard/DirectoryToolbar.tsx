import type { ReactNode } from "react";

/**
 * Canonical desktop Search + Views toolbar used by directory modules.
 * Keep Views in this shared row; do not move positioning into individual
 * module CSS.
 *
 * Desktop: one nowrap row — Search `flex: 1`, Views `flex: 0 0 auto` +
 * `margin-left: auto`. Filters are the next sibling, full width.
 * Mobile: Views is hidden here (`max-md:hidden` + unlayered CSS) and lives
 * in `MobileDirectoryControls` beside Filters.
 *
 * Desktop-first (same rule as DesktopDirectoryControls / PersonWorkspaceShell):
 * do not rely on `md:flex-row`. If that utility is not generated, `flex-col`
 * would stack Views under Search on desktop.
 */
export const DIRECTORY_TOOLBAR_CLASS = "flex flex-col gap-2.5";

export const DIRECTORY_TOOLBAR_PRIMARY_ROW_CLASS =
  "flex flex-nowrap items-center gap-3";

export const DIRECTORY_TOOLBAR_SEARCH_SLOT_CLASS = "min-w-0 flex-1";

export const DIRECTORY_TOOLBAR_VIEWS_SLOT_CLASS = "ml-auto shrink-0 max-md:hidden";

export const DIRECTORY_TOOLBAR_FILTERS_SLOT_CLASS = "min-w-0 w-full";

export default function DirectoryToolbar({
  search,
  views,
  filters,
}: {
  search: ReactNode;
  views: ReactNode;
  filters: ReactNode;
}) {
  return (
    <div data-directory-toolbar="" className={DIRECTORY_TOOLBAR_CLASS}>
      <div
        data-directory-toolbar-primary-row=""
        className={DIRECTORY_TOOLBAR_PRIMARY_ROW_CLASS}
      >
        <div data-directory-toolbar-search="" className={DIRECTORY_TOOLBAR_SEARCH_SLOT_CLASS}>
          {search}
        </div>
        <div data-directory-toolbar-views="" className={DIRECTORY_TOOLBAR_VIEWS_SLOT_CLASS}>
          {views}
        </div>
      </div>
      <div data-directory-toolbar-filters="" className={DIRECTORY_TOOLBAR_FILTERS_SLOT_CLASS}>
        {filters}
      </div>
    </div>
  );
}
