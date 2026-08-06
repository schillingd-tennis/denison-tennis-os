import type { LucideIcon } from "lucide-react";

/**
 * BP-035A / BP-035C — One navigable workspace module in WorkspaceNavigation.
 * Module-agnostic: Person, Recruiting, Operations, etc. supply their own items.
 * Selection drives the Adaptive Workspace — it does not open a drawer.
 */
export type WorkspaceNavItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Short meta lines shown under the title (scan-only, not full detail). */
  lines: string[];
};
