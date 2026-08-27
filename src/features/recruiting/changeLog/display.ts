import { formatDate, formatTime } from "@/lib/formatting";

import type {
  ChangeLogCategory,
  ChangeLogCategoryFilter,
  ChangeLogEvent,
  ChangeLogSource,
} from "./types";

export const CHANGE_LOG_CATEGORY_LABELS: Record<ChangeLogCategory, string> = {
  profile: "Profile",
  rankings: "Rankings",
  recruiting: "Recruiting",
  academics: "Academics",
  schools: "Schools",
  visits: "Visits",
  system: "System",
};

export const CHANGE_LOG_CATEGORY_FILTER_LABELS: Record<ChangeLogCategoryFilter, string> = {
  all: "All updates",
  profile: "Profile",
  rankings: "Rankings",
  recruiting: "Recruiting",
  academics: "Academics",
  schools: "Schools",
  visits: "Visits",
  system: "System",
};

export const CHANGE_LOG_SOURCE_LABELS: Record<ChangeLogSource, string> = {
  app: "App",
  import: "Import",
  integration: "Integration",
  system: "System",
  unknown: "Unknown",
};

export function changeLogEventTitle(event: Pick<ChangeLogEvent, "eventType" | "fieldLabel">): string {
  if (event.eventType === "recruit_created") return "Recruit added to the system";
  return `${event.fieldLabel ?? "Field"} updated`;
}

export function changeLogActorLabel(event: Pick<ChangeLogEvent, "actorUserId" | "source">): string {
  if (event.actorUserId) return "Authenticated user";
  if (event.source === "unknown") return "Unknown";
  return "System";
}

export function changeLogActorSourceLabel(event: Pick<ChangeLogEvent, "actorUserId" | "source">): string {
  return `${changeLogActorLabel(event)} · ${CHANGE_LOG_SOURCE_LABELS[event.source]}`;
}

export function changeLogTimestampLabel(occurredAt: string): string {
  return `${formatDate(occurredAt)} · ${formatTime(occurredAt)}`;
}

export function changeLogRelativeLabel(occurredAt: string, now: Date = new Date()): string {
  const ms = Date.parse(occurredAt);
  if (Number.isNaN(ms)) return formatDate(occurredAt);
  const deltaSec = Math.round((now.getTime() - ms) / 1000);
  if (deltaSec < 45) return "Just now";
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.round(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  const deltaDay = Math.round(deltaHr / 24);
  if (deltaDay < 7) return `${deltaDay}d ago`;
  return formatDate(occurredAt);
}

export function changeLogMatchesQuery(event: ChangeLogEvent, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [event.recruitName, changeLogEventTitle(event), event.fieldLabel, event.summary]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export const RECRUIT_CARD_EMPTY_LOG = "No tracked updates yet. New changes will appear here.";
export const CENTRAL_LOG_EMPTY = "No updates match these filters.";
export const DASHBOARD_EMPTY_LOG = "No tracked recruiting updates yet.";
