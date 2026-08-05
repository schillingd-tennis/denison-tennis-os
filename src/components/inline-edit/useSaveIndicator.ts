"use client";

import { useCallback, useEffect, useState } from "react";

import type { InlineSaveStatus } from "./types";

/** How long "Saved ✓" / "Error" linger before settling back to idle. */
const STATUS_DISPLAY_MS = 2000;

/**
 * Lightweight save-status state machine for auto-save UIs.
 *
 * `runSave(fn)` sets status to `saving`, awaits `fn`, then `saved` on
 * success or `error` on failure. Transient statuses auto-clear.
 */
export function useSaveIndicator() {
  const [status, setStatus] = useState<InlineSaveStatus>("idle");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (status !== "saved" && status !== "error") return;
    const timer = setTimeout(() => {
      setStatus("idle");
      setError(undefined);
    }, STATUS_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const runSave = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    setStatus("saving");
    setError(undefined);
    try {
      await fn();
      setStatus("saved");
      return true;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong while saving.");
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(undefined);
  }, []);

  return { status, error, runSave, reset };
}
