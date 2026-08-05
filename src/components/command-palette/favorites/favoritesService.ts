import { getPalettePersistenceStorage } from "./storage";
import { favoriteKey, type PinnedFavorite } from "./types";

const STORAGE_KEY = "denison-tennis-os:command-palette:favorites";

type Listener = () => void;

const listeners = new Set<Listener>();

function readRaw(): PinnedFavorite[] {
  const raw = getPalettePersistenceStorage().getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPinnedFavorite);
  } catch {
    return [];
  }
}

function isPinnedFavorite(value: unknown): value is PinnedFavorite {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.objectId === "string" &&
    typeof item.objectType === "string" &&
    typeof item.displayName === "string"
  );
}

function writeRaw(items: PinnedFavorite[]): void {
  getPalettePersistenceStorage().setItem(STORAGE_KEY, JSON.stringify(items));
  for (const listener of listeners) listener();
}

export function listFavorites(): PinnedFavorite[] {
  return readRaw();
}

export function isFavorite(objectType: string, objectId: string): boolean {
  const key = `${objectType}:${objectId}`;
  return readRaw().some((item) => favoriteKey(item) === key);
}

export function isFavoriteCommandId(commandId: string): boolean {
  return readRaw().some((item) => item.commandId === commandId);
}

export function pinFavorite(item: PinnedFavorite): void {
  const key = favoriteKey(item);
  const next = [item, ...readRaw().filter((existing) => favoriteKey(existing) !== key)];
  writeRaw(next);
}

export function unpinFavorite(objectType: string, objectId: string): void {
  const key = `${objectType}:${objectId}`;
  writeRaw(readRaw().filter((item) => favoriteKey(item) !== key));
}

export function unpinFavoriteByCommandId(commandId: string): void {
  writeRaw(readRaw().filter((item) => item.commandId !== commandId));
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
