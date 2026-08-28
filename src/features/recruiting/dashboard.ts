import {
  COMMUNICATION_ALERT_CLASS_YEAR,
  followUpDaysLabel,
  followUpRecruits,
  uniqueFollowUpCount,
  type FollowUpRecruit,
} from "@/features/interactions/centralInsights";
import type { RecruitInteraction } from "@/features/interactions/types";
import { getDisplayName, getHometown } from "@/features/people/utils";
import {
  recruitingPersonCommunicationsPath,
  recruitingPersonVisitPath,
} from "@/lib/module-routes";
import { partitionTournamentsBySchedule } from "@/features/tournaments/location";
import type { Tournament } from "@/features/tournaments/types";

import { rankedPersonIdsForClass } from "./coachRank";
import type { DenisonCommitRecruit, RecruitDirectoryRow } from "./directory";
import { isEligibleForRecruiting } from "./eligibility";
import { RECRUIT_PIPELINE_KEYS } from "./lookupSeed";
import { calendarDateOnly, visitDayCount } from "./visitDays";

export const DASHBOARD_RECENT_INTERACTION_LIMIT = 10;
export const DASHBOARD_TOP_RANKED_LIMIT = 5;
export const DASHBOARD_UPCOMING_TOURNAMENT_LIMIT = 5;
export const DASHBOARD_UPCOMING_VISIT_LIMIT = 4;
/** Dashboard Denison Commits (KPI + card) show this recruiting class only. */
export const DASHBOARD_COMMIT_CLASS_YEAR = 2027;

export function recentInteractions(
  interactions: readonly RecruitInteraction[],
  limit = DASHBOARD_RECENT_INTERACTION_LIMIT,
): RecruitInteraction[] {
  return [...interactions]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

export type RankedDashboardRecruit = {
  personId: string;
  name: string;
  coachRank: number;
  classYear?: number;
  utr?: number;
  trnRank?: number;
};

/** Same Coach Rank order as Recruit List > Rank for the current recruiting class. */
export function topRankedRecruits(
  rows: readonly RecruitDirectoryRow[],
  limit = DASHBOARD_TOP_RANKED_LIMIT,
): RankedDashboardRecruit[] {
  const byId = new Map(rows.map((row) => [row.person.id, row]));
  return rankedPersonIdsForClass(rows, COMMUNICATION_ALERT_CLASS_YEAR)
    .filter((personId) => {
      const row = byId.get(personId);
      if (!row) return false;
      return isEligibleForRecruiting(row.person, row.profile);
    })
    .slice(0, limit)
    .map((personId) => {
      const row = byId.get(personId)!;
      return {
        personId: row.person.id,
        name: getDisplayName(row.person),
        coachRank: row.profile.coachRank as number,
        classYear: row.profile.recruitClassYear,
        utr: row.person.utr,
        trnRank: row.person.trnRank,
      };
    });
}

export function upcomingTournaments(
  tournaments: readonly Tournament[],
  limit = DASHBOARD_UPCOMING_TOURNAMENT_LIMIT,
): Tournament[] {
  return partitionTournamentsBySchedule(tournaments).upcoming.slice(0, limit);
}

export type UpcomingDashboardVisit = {
  personId: string;
  name: string;
  visitStartDate: string;
  visitEndDate: string;
  dayCount: number | null;
  travelType?: string;
};

function localTodayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Next campus visits: end date is today or later, soonest start first.
 */
export function upcomingVisits(
  rows: readonly RecruitDirectoryRow[],
  options?: { today?: string; limit?: number },
): UpcomingDashboardVisit[] {
  const today = options?.today ?? localTodayIso();
  const limit = options?.limit ?? DASHBOARD_UPCOMING_VISIT_LIMIT;

  return rows
    .flatMap((row) => {
      const visitStartDate = calendarDateOnly(row.profile.visitStartDate);
      const visitEndDate = calendarDateOnly(row.profile.visitEndDate);
      if (!visitStartDate || !visitEndDate) return [];
      if (visitEndDate < today) return [];
      return [
        {
          personId: row.person.id,
          name: getDisplayName(row.person),
          visitStartDate,
          visitEndDate,
          dayCount: visitDayCount(visitStartDate, visitEndDate),
          travelType: row.profile.travelType,
        },
      ];
    })
    .sort((a, b) => {
      const start = a.visitStartDate.localeCompare(b.visitStartDate);
      if (start !== 0) return start;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    })
    .slice(0, limit);
}

export function denisonCommitSummary(commits: readonly DenisonCommitRecruit[]): {
  count: number;
  recruits: DenisonCommitRecruit[];
} {
  const recruits = commits.filter((recruit) => recruit.classYear === DASHBOARD_COMMIT_CLASS_YEAR);
  return { count: recruits.length, recruits };
}

export type DashboardKpis = {
  activeRecruits: number | null;
  needsAttention: number | null;
  visitsNext30Days: number | null;
  newTexts: number | null;
};

export type DashboardPipelineStage = {
  id: "potential" | "active" | "offer" | "committed";
  label: string;
  count: number | null;
};

function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  date.setDate(date.getDate() + days);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

/** Visits overlapping today through today+30, using stored visit dates only. */
export function visitsNext30DaysCount(
  rows: readonly RecruitDirectoryRow[],
  today = localTodayIso(),
): number {
  const windowEnd = addCalendarDays(today, 30);
  return rows.filter((row) => {
    const start = calendarDateOnly(row.profile.visitStartDate);
    const end = calendarDateOnly(row.profile.visitEndDate);
    if (!start || !end) return false;
    if (end < today) return false;
    if (start > windowEnd) return false;
    return true;
  }).length;
}

export function dashboardKpis(input: {
  activeRecruits: number;
  needsAttention: number;
  visitsNext30Days: number;
  newTexts: number | null;
}): DashboardKpis {
  return {
    activeRecruits: input.activeRecruits,
    needsAttention: input.needsAttention,
    visitsNext30Days: input.visitsNext30Days,
    newTexts: input.newTexts,
  };
}

/** Canonical pipeline key `active` (label: Active Recruit). */
export function activeRecruitCount(rows: readonly RecruitDirectoryRow[]): number {
  return rows.filter((row) => row.profile.pipelineStage?.key === RECRUIT_PIPELINE_KEYS.active).length;
}

export function communicationAlertEligibleIds(
  rows: readonly RecruitDirectoryRow[],
): Set<string> {
  return new Set(rankedPersonIdsForClass(rows, COMMUNICATION_ALERT_CLASS_YEAR));
}

export function dashboardCommunicationAlerts(
  interactions: readonly RecruitInteraction[],
  eligibleIds: ReadonlySet<string>,
  now: Date,
  limit = 5,
): FollowUpRecruit[] {
  return followUpRecruits(interactions, now, limit, eligibleIds);
}

export function dashboardNeedsAttentionCount(
  interactions: readonly RecruitInteraction[],
  eligibleIds: ReadonlySet<string>,
  now: Date,
): number {
  return uniqueFollowUpCount(interactions, now, eligibleIds);
}

export function newMessagesFromSync(status: {
  lastCompletedWithImports?: { importedCount: number | null } | null;
} | null): number | null {
  const count = status?.lastCompletedWithImports?.importedCount;
  return typeof count === "number" ? count : null;
}

export type DashboardPriority = {
  personId: string;
  name: string;
  meta: string | null;
  reason: string;
  timing: string;
  href: string;
};

export const DASHBOARD_PRIORITY_LIMIT = 5;

function recruitMeta(row: RecruitDirectoryRow | undefined): string | null {
  if (!row) return null;
  const year = row.profile.recruitClassYear;
  const hometown = getHometown(row.person);
  const parts = [year ? String(year) : null, hometown ?? null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function dashboardPriorities(input: {
  alerts: readonly FollowUpRecruit[];
  visits: readonly UpcomingDashboardVisit[];
  rows: readonly RecruitDirectoryRow[];
  limit?: number;
}): DashboardPriority[] {
  const limit = input.limit ?? DASHBOARD_PRIORITY_LIMIT;
  const byId = new Map(input.rows.map((row) => [row.person.id, row]));
  const seen = new Set<string>();
  const items: DashboardPriority[] = [];
  for (const alert of input.alerts) {
    if (seen.has(alert.recruitPersonId)) continue;
    seen.add(alert.recruitPersonId);
    items.push({
      personId: alert.recruitPersonId,
      name: alert.recruitName,
      meta: recruitMeta(byId.get(alert.recruitPersonId)),
      reason: "Needs a text or call",
      timing: followUpDaysLabel(alert.daysSinceContact),
      href: recruitingPersonCommunicationsPath(alert.recruitPersonId),
    });
    if (items.length >= limit) return items;
  }
  for (const visit of input.visits) {
    if (seen.has(visit.personId)) continue;
    seen.add(visit.personId);
    const row = byId.get(visit.personId);
    items.push({
      personId: visit.personId,
      name: visit.name,
      meta: recruitMeta(row),
      reason: "Upcoming visit",
      timing: visit.visitStartDate,
      href: recruitingPersonVisitPath(visit.personId),
    });
    if (items.length >= limit) return items;
  }
  return items;
}

export function pipelineSnapshot(
  rows: readonly RecruitDirectoryRow[],
): DashboardPipelineStage[] {
  const countFor = (key: string) =>
    rows.filter((row) => row.profile.pipelineStage?.key === key).length;
  return [
    { id: "potential", label: "Potential", count: countFor(RECRUIT_PIPELINE_KEYS.potential) },
    { id: "active", label: "Active Recruit", count: countFor(RECRUIT_PIPELINE_KEYS.active) },
    { id: "offer", label: "Offer", count: null },
    { id: "committed", label: "Committed", count: countFor(RECRUIT_PIPELINE_KEYS.committed) },
  ];
}
