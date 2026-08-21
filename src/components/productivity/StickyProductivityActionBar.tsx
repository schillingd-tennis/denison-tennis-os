import type { ReactNode } from "react";

/**
 * Sticky Productivity Action Bar (BP-021).
 *
 * Stays visible while the page scrolls. Modules supply leading chrome
 * (back link, title, save indicator) and trailing / action slots — typically
 * `QuickActionButton`s for Call / Text / Email / Copy Found Set / Export, etc.
 * Deliberately record-agnostic so Team, Recruiting, and future workspaces
 * share one sticky-bar chrome.
 *
 * Optional `trailingActions`: mobile-only (`md:hidden`). On mobile a flex
 * spacer pins this group to the far right of the action row. Never shown at
 * `md+` (e.g. Recruit Coach Notes / Game Notes quick-entry).
 */
export default function StickyProductivityActionBar({
  leading,
  actions,
  trailingActions,
  className,
}: {
  leading?: ReactNode;
  actions?: ReactNode;
  /** Pinned to the far right of the action row on mobile via flex growth. */
  trailingActions?: ReactNode;
  className?: string;
}) {
  const hasActions = Boolean(actions) || Boolean(trailingActions);

  return (
    <div
      className={`sticky top-0 z-20 -mx-1 border-b border-[var(--module-border)] bg-app-background px-1 py-3 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">{leading}</div>
        {hasActions ? (
          <div
            className={`flex min-w-0 items-center gap-1.5 ${
              trailingActions ? "w-full md:w-auto" : ""
            }`}
          >
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>
            ) : null}
            {trailingActions ? (
              <>
                {/* Mobile-only flexible space — pins trailing group to the right edge. */}
                <div className="min-w-0 flex-1 basis-3 md:hidden" aria-hidden />
                {/* Note quick-entry (and similar) is mobile-only. */}
                <div className="flex shrink-0 items-center gap-1.5 md:hidden">
                  {trailingActions}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
