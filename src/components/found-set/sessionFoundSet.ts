import { buildFoundSetMatrix } from "./serialize";
import type { FoundSetColumn, FoundSetSnapshot } from "./types";

const STORAGE_PREFIX = "denison-tennis-os:found-set:";

function storageKey(moduleKey: string): string {
  return `${STORAGE_PREFIX}${moduleKey}`;
}

/**
 * Publish the current found set so other routes (e.g. a Player Workspace)
 * can Copy / Export the same search · filter · sort result without the
 * list still being mounted.
 */
export function publishFoundSet<T>({
  moduleKey,
  filenameBase,
  rows,
  columns,
}: {
  moduleKey: string;
  filenameBase: string;
  rows: T[];
  columns: FoundSetColumn<T>[];
}): FoundSetSnapshot {
  const matrix = buildFoundSetMatrix(rows, columns);
  const snapshot: FoundSetSnapshot = {
    moduleKey,
    filenameBase,
    headers: matrix.headers,
    rows: matrix.rows,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(storageKey(moduleKey), JSON.stringify(snapshot));
    } catch {
      // Private mode / quota — live list copy/export still works without persistence.
    }
  }

  return snapshot;
}

/** Read the last published found set for a module, or `null` if none. */
export function readFoundSetSnapshot(moduleKey: string): FoundSetSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(moduleKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FoundSetSnapshot;
    if (
      !parsed ||
      parsed.moduleKey !== moduleKey ||
      !Array.isArray(parsed.headers) ||
      !Array.isArray(parsed.rows)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
