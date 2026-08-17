"use client";

import { LogOut, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { logout } from "@/app/login/actions";
import { useCommandPalette } from "@/components/command-palette";

import { getPageTitle } from "./nav-items";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { setOpen } = useCommandPalette();
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
    <header className="relative flex min-h-[var(--header-height)] items-center justify-between gap-4 border-b border-[var(--module-border)] bg-surface px-6 md:px-10">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-[var(--module-accent)]"
      />
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
          title="Command palette (⌘K)"
          className="inline-flex h-9 items-center gap-2 rounded-control border border-border bg-app-background px-2.5 text-text-secondary transition-colors hover:border-text-secondary/40 hover:text-text-primary"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="hidden text-xs sm:inline">Search</span>
          <kbd className="hidden rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px] sm:inline">
            ⌘K
          </kbd>
        </button>
        <div className="hidden text-right md:block">
          <p className="text-sm font-medium text-text-primary">
            David Schilling
          </p>
          <p className="text-xs text-text-secondary">Head Coach</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-denison-red text-sm font-semibold text-surface">
          DS
        </div>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-app-background hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </header>
  );
}
