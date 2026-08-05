"use client";

import { useSyncExternalStore } from "react";

import {
  EMPTY_FAVORITES,
  isFavorite,
  listFavorites,
  subscribeFavorites,
  toggleFavorite,
  unpinFavorite,
  pinFavorite,
} from "./favoritesService";
import {
  EMPTY_RECENTS,
  listRecents,
  recordRecentOpen,
  subscribeRecents,
} from "./recentsService";
import type { PinnedFavorite } from "./types";

function subscribeFavoritesStore(onStoreChange: () => void): () => void {
  return subscribeFavorites(onStoreChange);
}

function subscribeRecentsStore(onStoreChange: () => void): () => void {
  return subscribeRecents(onStoreChange);
}

function getServerFavorites(): PinnedFavorite[] {
  return EMPTY_FAVORITES;
}

function getServerRecents() {
  return EMPTY_RECENTS;
}

export function useFavorites(): PinnedFavorite[] {
  return useSyncExternalStore(subscribeFavoritesStore, listFavorites, getServerFavorites);
}

export function useRecents() {
  return useSyncExternalStore(subscribeRecentsStore, listRecents, getServerRecents);
}

export function useIsFavorite(objectType: string, objectId: string): boolean {
  // getSnapshot must return a stable primitive (boolean). Do not allocate.
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
