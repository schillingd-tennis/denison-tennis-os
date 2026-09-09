import {
  genericScheduleIdentity,
  resolveScheduleIdentityFromLabel,
  type ScheduleIdentity,
} from "@/features/teamSchedule/schoolIdentity";

/** Resolve scouting team display names to existing schoolIdentity (exact-friendly). */
export function resolveScoutingTeamIdentity(displayName: string): ScheduleIdentity | null {
  const trimmed = displayName.trim();
  if (!trimmed) return null;
  return resolveScheduleIdentityFromLabel(trimmed);
}

/** Canonical OS label when known; otherwise the stored source display name. */
export function scoutingTeamCanonicalLabel(displayName: string): string {
  return resolveScoutingTeamIdentity(displayName)?.label ?? displayName.trim();
}

/** Identity with initials fallback for logo marks (never remote/hotlinked). */
export function scoutingTeamIdentityOrFallback(displayName: string): ScheduleIdentity {
  const trimmed = displayName.trim() || "Team";
  return resolveScoutingTeamIdentity(trimmed) ?? genericScheduleIdentity(trimmed);
}
