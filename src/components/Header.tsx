"use client";

import { usePathname } from "next/navigation";

import { getPageTitle } from "./nav-items";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const title = getPageTitle(pathname);

  // Computed on both server and client; suppressed below since the exact
  // wall-clock date can legitimately differ between the two renders.
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="flex min-h-[var(--header-height)] items-center justify-between gap-4 border-b border-border bg-surface px-6 md:px-10">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-primary hover:bg-app-background md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            className="h-5 w-5"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          {isHome ? (
            <>
              <h1 className="truncate text-lg font-semibold text-text-primary md:text-xl">
                Good Evening, David
              </h1>
              <p
                className="truncate text-xs text-text-secondary"
                suppressHydrationWarning
              >
                {today}
              </p>
            </>
          ) : (
            <h1 className="truncate text-lg font-semibold text-text-primary">
              {title}
            </h1>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-text-primary">
            David Schilling
          </p>
          <p className="text-xs text-text-secondary">Head Coach</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-denison-red text-sm font-semibold text-surface">
          DS
        </div>
      </div>
    </header>
  );
}
