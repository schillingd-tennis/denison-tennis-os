import { getPalettePersistenceStorage } from "./storage";
import { favoriteKey, type PinnedFavorite } from "./types";

const STORAGE_KEY = "denison-tennis-os:command-palette:favorites";

/** Stable empty snapshot for useSyncExternalStore (must be referentially equal). */
export const EMPTY_FAVORITES: PinnedFavorite[] = [];

type Listener = () => void;

const listeners = new Set<Listener>();

/** Cached snapshot — listFavorites() must return the same reference until data changes. */
let snapshot: PinnedFavorite[] = EMPTY_FAVORITES;
let hydrated = false;

function isPinnedFavorite(value: unknown): value is PinnedFavorite {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.objectId === "string" &&
    typeof item.objectType === "string" &&
    typeof item.displayName === "string"
  );
}

function parseRaw(raw: string | null): PinnedFavorite[] {
  if (!raw) return EMPTY_FAVORITES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_FAVORITES;
    const items = parsed.filter(isPinnedFavorite);
    return items.length === 0 ? EMPTY_FAVORITES : items;
  } catch {
    return EMPTY_FAVORITES;
  }
}

function ensureHydrated(): void {
  if (hydrated) return;
  if (typeof window === "undefined") {
    snapshot = EMPTY_FAVORITES;
    hydrated = true;
    return;
  }
  snapshot = parseRaw(getPalettePersistenceStorage().getItem(STORAGE_KEY));
  hydrated = true;
}

function writeRaw(items: PinnedFavorite[]): void {
  snapshot = items.length === 0 ? EMPTY_FAVORITES : items;
  hydrated = true;
  getPalettePersistenceStorage().setItem(STORAGE_KEY, JSON.stringify(items));
  for (const listener of listeners) listener();
}

export function listFavorites(): PinnedFavorite[] {
  ensureHydrated();
  return snapshot;
}

export function isFavorite(objectType: string, objectId: string): boolean {
  const key = `${objectType}:${objectId}`;
  return listFavorites().some((item) => favoriteKey(item) === key);
}

export function isFavoriteCommandId(commandId: string): boolean {
  return listFavorites().some((item) => item.commandId === commandId);
}

export function pinFavorite(item: PinnedFavorite): void {
  const key = favoriteKey(item);
  const next = [item, ...listFavorites().filter((existing) => favoriteKey(existing) !== key)];
  writeRaw(next);
}

export function unpinFavorite(objectType: string, objectId: string): void {
  const key = `${objectType}:${objectId}`;
  writeRaw(listFavorites().filter((item) => favoriteKey(item) !== key));
}

export function unpinFavoriteByCommandId(commandId: string): void {
  writeRaw(listFavorites().filter((item) => item.commandId !== commandId));
}

/** Returns true when the item is pinned after the toggle. */
export function toggleFavorite(item: PinnedFavorite): boolean {
  if (isFavorite(item.objectType, item.objectId)) {
    unpinFavorite(item.objectType, item.objectId);
    return false;
  }
  pinFavorite(item);
  return true;
}

export function subscribeFavorites(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
