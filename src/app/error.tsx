"use client";

import { useEffect } from "react";

import EmptyState from "@/components/EmptyState";

/**
 * Segment error UI inside the root layout. AppShell (sidebar + header)
 * stays mounted; only the main page slot is replaced. Prevents a thrown
 * page (e.g. missing DB table) from wiping the entire OS chrome.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <EmptyState
        title="This page could not load"
        description={error.message || "An unexpected error occurred."}
      />
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 w-fit items-center justify-center rounded-control bg-[var(--module-accent)] px-5 text-sm font-semibold text-surface"
      >
        Try again
      </button>
    </div>
  );
}
