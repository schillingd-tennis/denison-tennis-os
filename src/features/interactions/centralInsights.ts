import { APPLE_MESSAGES_SOURCE_SYSTEM } from "./appleMessages";
import {
  INTERACTIONS_TIME_ZONE,
  addCivilDays,
  calendarDaysBetweenCivil,
  civilDateInZone,
  matchesPeriod,
  type InteractionKindFilter,
  type InteractionPeriod,
} from "./centralPeriod";
import type { InteractionType, RecruitInteraction } from "./types";

export const FOLLOW_UP_AFTER_DAYS = 10;
export const LIST_QUERY_LIMIT = 5000;
/** Communication Alerts only consider this recruiting class. */
export const COMMUNICATION_ALERT_CLASS_YEAR = 2027;

const TEXT_TYPES: InteractionType[] = ["text", "message"];
const CALL_TYPES: InteractionType[] = ["call"];
const EMAIL_TYPES: InteractionType[] = ["email"];
const VISIT_TYPES: InteractionType[] = ["visit"];
const CONTACT_TYPES: InteractionType[] = ["text", "message", "call"];

export function typesForKind(kind: InteractionKindFilter): InteractionType[] | null {
  if (kind === "all") return null;
  if (kind === "texts") return TEXT_TYPES;
  if (kind === "calls") return CALL_TYPES;
  if (kind === "emails") return EMAIL_TYPES;
  return VISIT_TYPES;
}

export function matchesKind(type: InteractionType, kind: InteractionKindFilter): boolean {
  const types = typesForKind(kind);
  return types ? types.includes(type) : true;
}

export function matchesSearch(row: RecruitInteraction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.recruitName, row.notes, row.nextSteps, row.loggedBy, row.tournamentName, row.interactionType].some(
    (value) => value?.toLowerCase().includes(q),
  );
}

export function filterCentralInteractions(
  rows: readonly RecruitInteraction[],
  options: {
    period: InteractionPeriod;
    kind: InteractionKindFilter;
    query: string;
    now: Date;
    applyKind?: boolean;
  },
): RecruitInteraction[] {
  const applyKind = options.applyKind !== false;
  return rows.filter((row) => {
    if (!matchesPeriod(row.occurredAt, options.period, options.now)) return false;
    if (applyKind && !matchesKind(row.interactionType, options.kind)) return false;
    return matchesSearch(row, options.query);
  });
}

export function latestOccurredAt(rows: readonly RecruitInteraction[]): string | null {
  let latest: string | null = null;
  let latestMs = -Infinity;
  for (const row of rows) {
    const ms = Date.parse(row.occurredAt);
    if (Number.isNaN(ms) || ms <= latestMs) continue;
    latestMs = ms;
    latest = row.occurredAt;
  }
  return latest;
}

export function countThisWeek(rows: readonly RecruitInteraction[], now: Date): number {
  return rows.filter((row) => matchesPeriod(row.occurredAt, "past_week", now)).length;
}

export type FollowUpRecruit = {
  recruitPersonId: string;
  recruitName: string;
  daysSinceContact: number;
};

function latestContactByRecruit(rows: readonly RecruitInteraction[]): Map<string, RecruitInteraction> {
  const latest = new Map<string, RecruitInteraction>();
  for (const row of rows) {
    if (!CONTACT_TYPES.includes(row.interactionType)) continue;
    const current = latest.get(row.recruitPersonId);
    if (!current) {
      latest.set(row.recruitPersonId, row);
      continue;
    }
    const newer = Date.parse(row.occurredAt) - Date.parse(current.occurredAt);
    if (newer > 0 || (newer === 0 && Date.parse(row.createdAt) > Date.parse(current.createdAt))) {
      latest.set(row.recruitPersonId, row);
    }
  }
  return latest;
}

export function followUpRecruits(
  rows: readonly RecruitInteraction[],
  now: Date,
  limit = 5,
  eligiblePersonIds?: ReadonlySet<string> | null,
): FollowUpRecruit[] {
  const today = civilDateInZone(now, INTERACTIONS_TIME_ZONE);
  const overdue: FollowUpRecruit[] = [];
  for (const [recruitPersonId, row] of latestContactByRecruit(rows)) {
    if (eligiblePersonIds && !eligiblePersonIds.has(recruitPersonId)) continue;
    const occurredDay = civilDateInZone(new Date(row.occurredAt), INTERACTIONS_TIME_ZONE);
    const days = calendarDaysBetweenCivil(occurredDay, today);
    if (days <= FOLLOW_UP_AFTER_DAYS) continue;
    overdue.push({ recruitPersonId, recruitName: row.recruitName, daysSinceContact: days });
  }
  overdue.sort((a, b) => b.daysSinceContact - a.daysSinceContact || a.recruitName.localeCompare(b.recruitName));
  return overdue.slice(0, limit);
}

export function uniqueFollowUpCount(
  rows: readonly RecruitInteraction[],
  now: Date,
  eligiblePersonIds?: ReadonlySet<string> | null,
): number {
  return followUpRecruits(rows, now, Number.POSITIVE_INFINITY, eligiblePersonIds).length;
}

export function followUpDaysLabel(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

export type ActivityCounts = {
  texts: number;
  calls: number;
  emails: number;
  visits: number;
};

export function activityByType(rows: readonly RecruitInteraction[]): ActivityCounts {
  const counts: ActivityCounts = { texts: 0, calls: 0, emails: 0, visits: 0 };
  for (const row of rows) {
    if (TEXT_TYPES.includes(row.interactionType)) counts.texts += 1;
    else if (CALL_TYPES.includes(row.interactionType)) counts.calls += 1;
    else if (EMAIL_TYPES.includes(row.interactionType)) counts.emails += 1;
    else if (VISIT_TYPES.includes(row.interactionType)) counts.visits += 1;
  }
  return counts;
}

export function countAppleMessages(rows: readonly RecruitInteraction[]): number {
  return rows.filter((row) => row.sourceSystem === APPLE_MESSAGES_SOURCE_SYSTEM).length;
}

export function weekRangeLabel(now: Date): string {
  const today = civilDateInZone(now, INTERACTIONS_TIME_ZONE);
  const start = addCivilDays(today, -6);
  return `${start.month}/${start.day}–${today.month}/${today.day}`;
}
