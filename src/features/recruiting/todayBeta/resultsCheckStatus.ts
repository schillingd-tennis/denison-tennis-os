/**
 * Results check workflow — monitoring status, queue sort, and activity summary.
 */
import { formatDate, formatTime } from "@/lib/formatting";

import type {
  ResultsMonitoringStatus,
  TodayBetaActivitySummary,
  TodayBetaPlayerRow,
  TrnExternalProfile,
  UtrExternalProfile,
} from "./types";
import {
  combinedLastCheckSavedNewCount,
  latestResultsCheckAt,
} from "./utrProfile";

export function isSameCalendarDay(
  iso: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) === now.toISOString().slice(0, 10);
}

export function deriveMonitoringStatus(input: {
  lastCheckedAt?: string;
  lastCheckSavedNewCount?: number;
  now?: Date;
}): ResultsMonitoringStatus {
  const now = input.now ?? new Date();
  if (!isSameCalendarDay(input.lastCheckedAt, now)) {
    return "NEEDS_CHECK";
  }
  if ((input.lastCheckSavedNewCount ?? 0) > 0) {
    return "NEW_RESULTS_FOUND";
  }
  return "CHECKED_TODAY";
}

/** Either TRN or UTR check counts toward Today Beta monitoring status. */
export function deriveCombinedMonitoringStatus(input: {
  trn?: TrnExternalProfile;
  utr?: UtrExternalProfile;
  now?: Date;
}): ResultsMonitoringStatus {
  return deriveMonitoringStatus({
    lastCheckedAt: latestResultsCheckAt(input.trn?.lastCheckedAt, input.utr?.lastCheckedAt),
    lastCheckSavedNewCount: combinedLastCheckSavedNewCount(input.trn, input.utr),
    now: input.now,
  });
}

export function monitoringStatusSortOrder(status: ResultsMonitoringStatus): number {
  switch (status) {
    case "NEEDS_CHECK":
      return 0;
    case "NEW_RESULTS_FOUND":
      return 1;
    case "CHECKED_TODAY":
      return 2;
  }
}

export function prioritySortKey(label: string | null | undefined): number {
  if (!label) return 999;
  if (label.startsWith("1 -")) return 1;
  if (label.startsWith("2 -")) return 2;
  if (label.startsWith("3 -")) return 3;
  return 100;
}

export function comparePlayersForMonitoringQueue(a: TodayBetaPlayerRow, b: TodayBetaPlayerRow): number {
  const statusDiff =
    monitoringStatusSortOrder(a.monitoringStatus) -
    monitoringStatusSortOrder(b.monitoringStatus);
  if (statusDiff !== 0) return statusDiff;

  const classDiff = (a.recruitClassYear ?? 9999) - (b.recruitClassYear ?? 9999);
  if (classDiff !== 0) return classDiff;

  const rankDiff = (a.coachRank ?? 9999) - (b.coachRank ?? 9999);
  if (rankDiff !== 0) return rankDiff;

  const priorityDiff = prioritySortKey(a.recruitPriorityLabel) - prioritySortKey(b.recruitPriorityLabel);
  if (priorityDiff !== 0) return priorityDiff;

  return a.displayName.localeCompare(b.displayName);
}

export function sortPlayersForMonitoringQueue(
  players: readonly TodayBetaPlayerRow[],
): TodayBetaPlayerRow[] {
  return [...players].sort(comparePlayersForMonitoringQueue);
}

export function applyCheckedNoNewToTrnProfile(
  trn: TrnExternalProfile,
  now: string,
): TrnExternalProfile {
  return {
    ...trn,
    lastCheckedAt: now,
    lastCheckSavedNewCount: 0,
  };
}

export function applyImportCheckToTrnProfile(
  trn: TrnExternalProfile,
  now: string,
  savedAsNew: number,
  baselineEstablishedAt?: string,
): TrnExternalProfile {
  return {
    ...trn,
    lastCheckedAt: now,
    lastImportedAt: now,
    lastCheckSavedNewCount: savedAsNew,
    baselineEstablishedAt: trn.baselineEstablishedAt ?? baselineEstablishedAt,
  };
}

export function formatMonitoringStatusLabel(status: ResultsMonitoringStatus): string {
  switch (status) {
    case "NEEDS_CHECK":
      return "Needs Check";
    case "CHECKED_TODAY":
      return "Checked Today";
    case "NEW_RESULTS_FOUND":
      return "New Results Found";
  }
}

export function formatMonitoringTimestamp(
  iso: string | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return "Never";
  if (isSameCalendarDay(iso, now)) {
    return `Today, ${formatTime(iso)}`;
  }
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function buildActivitySummary(input: {
  players: readonly TodayBetaPlayerRow[];
  newResultsCount: number;
  recruitsWithActivityLast14Days: number;
  utrConfiguredCount?: number;
  utrAgentLastBatch?: TodayBetaActivitySummary["utrAgentLastBatch"];
  now?: Date;
}): TodayBetaActivitySummary {
  const readyPlayers = input.players.filter((player) => player.status === "Ready");
  const recruitsMonitored = readyPlayers.length;
  const utrConfiguredCount =
    input.utrConfiguredCount ?? readyPlayers.filter((player) => player.utrPlayerId).length;
  const missingUtrCount = recruitsMonitored - utrConfiguredCount;
  const matchesStored = readyPlayers.reduce((total, player) => total + player.matchesStored, 0);
  const baselinesEstablished = readyPlayers.filter((player) => player.baselineEstablished).length;
  const now = input.now ?? new Date();

  const checkedTodayCount = readyPlayers.filter((player) =>
    isSameCalendarDay(player.lastCheckedAt, now),
  ).length;

  let lastMonitoringActivityAt: string | null = null;
  let lastImportAt: string | null = null;

  for (const player of readyPlayers) {
    if (player.lastCheckedAt) {
      if (
        !lastMonitoringActivityAt ||
        Date.parse(player.lastCheckedAt) > Date.parse(lastMonitoringActivityAt)
      ) {
        lastMonitoringActivityAt = player.lastCheckedAt;
      }
    }
    if (player.lastImportedAt) {
      if (!lastImportAt || Date.parse(player.lastImportedAt) > Date.parse(lastImportAt)) {
        lastImportAt = player.lastImportedAt;
      }
    }
  }

  return {
    recruitsMonitored,
    checkedTodayCount,
    newResultsCount: input.newResultsCount,
    matchesStored,
    baselinesEstablished,
    lastMonitoringActivityAt,
    lastImportAt,
    recruitsWithActivityLast14Days: input.recruitsWithActivityLast14Days,
    utrConfiguredCount,
    missingUtrCount,
    utrAgentLastBatch: input.utrAgentLastBatch,
  };
}

export function formatUtrAgentLastBatchLabel(
  batch: NonNullable<TodayBetaActivitySummary["utrAgentLastBatch"]>,
): string {
  const minutes = Math.floor(batch.durationMs / 60_000);
  const seconds = Math.round((batch.durationMs % 60_000) / 1000);
  const runtime =
    minutes > 0 ? `${minutes}m ${seconds}s` : `${Math.max(1, Math.round(batch.durationMs / 1000))}s`;
  return `${batch.recruitsChecked} checked · ${runtime} · ${batch.newInserted} new · ${batch.failed} failed`;
}
