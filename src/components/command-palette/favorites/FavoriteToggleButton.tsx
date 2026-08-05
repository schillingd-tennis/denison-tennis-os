"use client";

import { Pin, PinOff } from "lucide-react";
import { useCallback, useState } from "react";

import QuickActionButton from "@/components/QuickActionButton";
import type { SearchObjectType } from "@/components/command-palette/types";

import { defaultIconKeyForType } from "./resolve";
import type { PinnedFavorite } from "./types";
import { toggleFavorite, useIsFavorite } from "./useFavorites";

/**
 * Pin / Unpin control for Person pages and other registered objects.
 * Updates Favorites instantly via the persistence service.
 */
export default function FavoriteToggleButton({
  objectId,
  objectType,
  displayName,
  href,
  commandId,
  iconKey,
}: {
  objectId: string;
  objectType: SearchObjectType;
  displayName: string;
  href?: string;
  commandId?: string;
  iconKey?: string;
}) {
  const pinned = useIsFavorite(objectType, objectId);
  const [feedback, setFeedback] = useState<string | undefined>();

  const onToggle = useCallback(() => {
    const item: PinnedFavorite = {
      objectId,
      objectType,
      displayName,
      href,
      commandId,
      iconKey: iconKey ?? defaultIconKeyForType(objectType),
    };
    const nowPinned = toggleFavorite(item);
    setFeedback(nowPinned ? "Pinned" : "Unpinned");
    window.setTimeout(() => setFeedback(undefined), 1500);
  }, [commandId, displayName, href, iconKey, objectId, objectType]);

  return (
    <span className="inline-flex items-center gap-2">
      {feedback ? (
        <span className="text-xs font-medium text-text-secondary" role="status">
          {feedback}
        </span>
      ) : null}
      <QuickActionButton
        onAction={onToggle}
        icon={pinned ? PinOff : Pin}
        label={pinned ? "Unpin from Favorites" : "Pin to Favorites"}
        tone={pinned ? "denison" : "neutral"}
      />
    </span>
  );
}
