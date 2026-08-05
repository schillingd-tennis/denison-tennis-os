"use client";

import { useEffect, useState } from "react";

import { getRolesAction, getStatusesAction } from "./actions";
import type { LookupRecord } from "./types";

/**
 * Client hook for active roles. Prefer server-passed props when available;
 * this covers editor surfaces that mount without a full RSC reload.
 */
export function useRoles(initial?: readonly LookupRecord[]): LookupRecord[] {
  const hasInitial = Boolean(initial && initial.length > 0);
  const [fetched, setFetched] = useState<LookupRecord[]>([]);

  useEffect(() => {
    if (hasInitial) return;
    let cancelled = false;
    void getRolesAction().then((next) => {
      if (!cancelled) setFetched(next);
    });
    return () => {
      cancelled = true;
    };
  }, [hasInitial]);

  return hasInitial ? [...(initial ?? [])] : fetched;
}

export function useStatuses(initial?: readonly LookupRecord[]): LookupRecord[] {
  const hasInitial = Boolean(initial && initial.length > 0);
  const [fetched, setFetched] = useState<LookupRecord[]>([]);

  useEffect(() => {
    if (hasInitial) return;
    let cancelled = false;
    void getStatusesAction().then((next) => {
      if (!cancelled) setFetched(next);
    });
    return () => {
      cancelled = true;
    };
  }, [hasInitial]);

  return hasInitial ? [...(initial ?? [])] : fetched;
}
