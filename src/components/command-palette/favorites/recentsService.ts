import { getPalettePersistenceStorage } from "./storage";
import { favoriteKey, type PinnedFavorite, type RecentItem } from "./types";

const STORAGE_KEY = "denison-tennis-os:command-palette:recents-v2";
/** Legacy BP-021D command-id list — migrated on first read. */
const LEGACY_IDS_KEY = "denison-tennis-os:command-palette:recent";
const MAX_RECENTS = 16;

type Listener = () => void;

const listeners = new Set<Listener>();

function isRecentItem(value: unknown): value is RecentItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.objectId === "string" &&
    typeof item.objectType === "string" &&
    typeof item.displayName === "string" &&
    typeof item.openedAt === "string"
  );
}

function readRaw(): RecentItem[] {
  const storage = getPalettePersistenceStorage();
  const raw = storage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isRecentItem).slice(0, MAX_RECENTS);
    } catch {
      return [];
    }
  }

  // One-time migration from BP-021D id-only recents.
  const legacy = storage.getItem(LEGACY_IDS_KEY);
  if (!legacy) return [];
  try {
    const ids = JSON.parse(legacy) as unknown;
    if (!Array.isArray(ids)) return [];
    const migrated: RecentItem[] = ids
      .filter((id): id is string => typeof id === "string")
      .map((id) => ({
        objectId: id,
        objectType: "actions" as const,
        displayName: id,
        commandId: id,
        openedAt: new Date(0).toISOString(),
      }));
    if (migrated.length > 0) {
      storage.setItem(STORAGE_KEY, JSON.stringify(migrated.slice(0, MAX_RECENTS)));
    }
    return migrated.slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function writeRaw(items: RecentItem[]): void {
  getPalettePersistenceStorage().setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  for (const listener of listeners) listener();
}

export function listRecents(): RecentItem[] {
  return readRaw();
}

/** Record an opened searchable object (palette Enter, workspace open, etc.). */
export function recordRecentOpen(item: PinnedFavorite): void {
  const key = favoriteKey(item);
  const entry: RecentItem = {
    ...item,
    openedAt: new Date().toISOString(),
  };
  const next = [entry, ...readRaw().filter((existing) => favoriteKey(existing) !== key)].slice(
    0,
    MAX_RECENTS,
  );
  writeRaw(next);
}

export function subscribeRecents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
