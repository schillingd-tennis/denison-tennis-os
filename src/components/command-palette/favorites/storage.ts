/**
 * Key/value storage abstraction for Favorites + Recents (BP-021F).
 * Local implementation today; swap for a Supabase-backed adapter later
 * without changing palette UI or service call sites.
 */

export type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export const localKeyValueStorage: KeyValueStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Private mode / quota — persistence is best-effort.
    }
  },
  removeItem(key) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

let activeStorage: KeyValueStorage = localKeyValueStorage;

/** Replace the storage backend (e.g. tests or a future Supabase adapter). */
export function setPalettePersistenceStorage(storage: KeyValueStorage): void {
  activeStorage = storage;
}

export function getPalettePersistenceStorage(): KeyValueStorage {
  return activeStorage;
}
