import type { LucideIcon } from "lucide-react";

/**
 * Shared recent-activity feed item (BP-031F).
 * Person-agnostic — reusable for players, recruits, coaches, and alumni.
 */
export type ActivityItem = {
  id: string;
  title: string;
  /** Display timestamp (e.g. "Yesterday", "Aug 4"). */
  timestamp: string;
  description?: string;
  icon: LucideIcon;
};
