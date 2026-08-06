"use client";

import { useMemo } from "react";

import { getMockCommunications } from "../services/mockCommunications";
import type { Communication } from "../types";
import { sortCommunicationsNewestFirst } from "../utils/sortCommunications";

/**
 * Person-agnostic communications for a workspace.
 * BP-032A: mock-backed only — swap the service later for persistence.
 */
export function usePersonCommunications(personId: string): Communication[] {
  return useMemo(
    () => sortCommunicationsNewestFirst(getMockCommunications(personId)),
    [personId]
  );
}
