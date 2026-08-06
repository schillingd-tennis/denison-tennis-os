import type { Communication } from "../types";

/** Newest first by createdAt. */
export function sortCommunicationsNewestFirst(
  entries: Communication[]
): Communication[] {
  return [...entries].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
