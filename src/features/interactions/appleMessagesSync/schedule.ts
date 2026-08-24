export const SCHEDULED_HOUR = 23;
export const SCHEDULED_MINUTE = 0;
export const POLL_INTERVAL_SECONDS = 300;
export const POLL_INTERVAL_MS = POLL_INTERVAL_SECONDS * 1000;

export type TickDecision = "baseline" | "claim" | "catch_up" | "scheduled" | "idle";

export function localAt(
  now: Date,
  hour: number,
  minute: number,
  dayOffset = 0,
): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (dayOffset !== 0) date.setDate(date.getDate() + dayOffset);
  return date;
}

export function mostRecentScheduledAt(now: Date): Date {
  const today = localAt(now, SCHEDULED_HOUR, SCHEDULED_MINUTE);
  if (now.getTime() >= today.getTime()) return today;
  return localAt(now, SCHEDULED_HOUR, SCHEDULED_MINUTE, -1);
}

export function isInScheduledWindow(now: Date): boolean {
  const start = localAt(now, SCHEDULED_HOUR, SCHEDULED_MINUTE);
  const end = new Date(start.getTime() + POLL_INTERVAL_MS);
  return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
}

export function catchUpOwed(input: {
  now: Date;
  activationAt: string | null;
  lastImportSuccessAt: string | null;
}): boolean {
  if (!input.activationAt) return false;
  const cutoff = mostRecentScheduledAt(input.now);
  if (!(Date.parse(input.activationAt) < cutoff.getTime())) return false;
  if (!input.lastImportSuccessAt) return true;
  return Date.parse(input.lastImportSuccessAt) < cutoff.getTime();
}

export function scheduledOwed(input: {
  now: Date;
  activationAt: string | null;
  lastImportSuccessAt: string | null;
}): boolean {
  if (!isInScheduledWindow(input.now)) return false;
  if (!input.activationAt) return false;
  const tonight = localAt(input.now, SCHEDULED_HOUR, SCHEDULED_MINUTE);
  if (!(Date.parse(input.activationAt) < tonight.getTime())) return false;
  if (!input.lastImportSuccessAt) return true;
  return Date.parse(input.lastImportSuccessAt) < tonight.getTime();
}

export function decideTick(input: {
  hasBaseline: boolean;
  activeStatus: "queued" | "running" | null;
  now: Date;
  activationAt: string | null;
  lastImportSuccessAt: string | null;
}): TickDecision {
  if (!input.hasBaseline) return "baseline";
  if (input.activeStatus === "queued") return "claim";
  if (input.activeStatus === "running") return "idle";
  if (catchUpOwed(input) && !isInScheduledWindow(input.now)) return "catch_up";
  if (scheduledOwed(input)) return "scheduled";
  return "idle";
}
