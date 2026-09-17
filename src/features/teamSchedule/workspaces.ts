/**
 * Schedule Event Adaptive Workspace IDs — shared by server pages and client UI.
 * Keep free of "use client" so query-param parsing can run on the server.
 */

export const SCHEDULE_EVENT_WORKSPACE_IDS = [
  "event-details",
  "traveling-party",
  "teams-involved",
  "travel",
  "practice-match-times",
  "alumni-attending",
  "packing-list",
  "planning",
] as const;

export type ScheduleEventWorkspaceId = (typeof SCHEDULE_EVENT_WORKSPACE_IDS)[number];

export const DEFAULT_SCHEDULE_EVENT_WORKSPACE: ScheduleEventWorkspaceId = "event-details";

export function isScheduleEventWorkspaceId(
  value: string | null | undefined,
): value is ScheduleEventWorkspaceId {
  return SCHEDULE_EVENT_WORKSPACE_IDS.includes(value as ScheduleEventWorkspaceId);
}

export function parseScheduleEventWorkspaceId(
  value: string | null | undefined,
): ScheduleEventWorkspaceId {
  return isScheduleEventWorkspaceId(value) ? value : DEFAULT_SCHEDULE_EVENT_WORKSPACE;
}
