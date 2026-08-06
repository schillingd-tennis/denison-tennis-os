import type { ActivityItem } from "@/components/activity";
import { formatDate } from "@/lib/formatting";

import type { Communication } from "../types";
import { getCommunicationTypeIcon } from "./typeMeta";
import { sortCommunicationsNewestFirst } from "./sortCommunications";

/** Map domain communications into Recent Activity rows (presentation only). */
export function communicationsToActivityItems(
  entries: Communication[],
  limit = 5
): ActivityItem[] {
  return sortCommunicationsNewestFirst(entries)
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      timestamp: formatDate(entry.createdAt),
      description: entry.summary,
      icon: getCommunicationTypeIcon(entry.type),
    }));
}
