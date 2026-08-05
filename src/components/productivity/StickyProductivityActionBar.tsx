import type { ReactNode } from "react";

/**
 * Sticky Productivity Action Bar (BP-021).
 *
 * Stays visible while the page scrolls. Modules supply leading chrome
 * (back link, title, save indicator) and trailing / action slots — typically
 * `QuickActionButton`s for Call / Text / Email / Copy Found Set / Export, etc.
 * Deliberately record-agnostic so Team, Recruiting, and future workspaces
 * share one sticky-bar chrome.
 */
export default function StickyProductivityActionBar({
  leading,
  actions,
  className,
}: {
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky top-0 z-20 -mx-1 border-b border-border/80 bg-app-background/95 px-1 py-3 backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">{leading}</div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-1.5">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
