"use client";

import { useSyncExternalStore } from "react";

import {
  isFavorite,
  listFavorites,
  subscribeFavorites,
  toggleFavorite,
  unpinFavorite,
  pinFavorite,
} from "./favoritesService";
import { listRecents, recordRecentOpen, subscribeRecents } from "./recentsService";
import type { PinnedFavorite } from "./types";

function subscribeFavoritesStore(onStoreChange: () => void): () => void {
  return subscribeFavorites(onStoreChange);
}

function subscribeRecentsStore(onStoreChange: () => void): () => void {
  return subscribeRecents(onStoreChange);
}

export function useFavorites(): PinnedFavorite[] {
  return useSyncExternalStore(subscribeFavoritesStore, listFavorites, () => []);
}

export function useRecents() {
  return useSyncExternalStore(subscribeRecentsStore, listRecents, () => []);
}

export function useIsFavorite(objectType: string, objectId: string): boolean {
  return useSyncExternalStore(
    subscribeFavoritesStore,
    () => isFavorite(objectType, objectId),
    () => false,
  );
}

export {
  pinFavorite,
  unpinFavorite,
  toggleFavorite,
  isFavorite,
  recordRecentOpen,
  listFavorites,
  listRecents,
};
