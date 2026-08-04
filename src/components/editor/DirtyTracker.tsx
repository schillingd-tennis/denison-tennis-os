"use client";

import { useEffect } from "react";

/**
 * Warns on real browser-level navigation (refresh, tab close, typed URL,
 * external links) while there are unsaved edits. Mounted automatically by
 * `FormProvider`, so every editor built on it gets this for free.
 *
 * Note: this does not intercept Next.js client-side `<Link>` navigation
 * (no full page unload occurs), which is why in-page exit affordances
 * (e.g. a workspace's "Back" link) should additionally call
 * `confirmDiscardIfDirty` before navigating.
 */
export function useBeforeUnloadWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

/**
 * Guards an in-page navigation/exit action. Returns `true` (safe to
 * proceed) immediately if there's nothing unsaved; otherwise asks the user
 * to confirm before allowing the caller to continue.
 */
export function confirmDiscardIfDirty(isDirty: boolean): boolean {
  if (!isDirty) return true;
  return window.confirm("You have unsaved changes. Leave without saving?");
}
