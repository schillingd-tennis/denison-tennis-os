import type { SearchObjectType } from "@/components/command-palette/types";

/**
 * A user-pinned favorite (BP-021F). Serializable — no React/icon instances.
 * Optional `iconKey` is a Lucide name for future rich rendering.
 */
export type PinnedFavorite = {
  objectId: string;
  objectType: SearchObjectType;
  displayName: string;
  /** Registry command id when known (e.g. `person:…`, `page:/team`). */
  commandId?: string;
  /** Optional Lucide icon name for persistence across sessions. */
  iconKey?: string;
  /** Navigation target when the registry entry is not loaded yet. */
  href?: string;
};

/** Recently opened searchable object (same shape as a favorite). */
export type RecentItem = PinnedFavorite & {
  openedAt: string;
};

export function favoriteKey(item: Pick<PinnedFavorite, "objectType" | "objectId">): string {
  return `${item.objectType}:${item.objectId}`;
}
