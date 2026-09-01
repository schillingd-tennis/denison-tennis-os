/**
 * Latest-result selection for Today Beta monitoring (display only).
 */
import { calendarDaysBetween } from "@/features/interactions/contactSummary";
import { parseDisplayDate } from "@/lib/formatting";

import type { LatestResultEntry, LatestResultRow, MatchResultOutcome, RecruitMatchResult } from "./types";

/** Static Tailwind classes — must remain literal strings for build-time discovery. */
export const RESULT_OUTCOME_TONE_CLASS = {
  WIN: "font-semibold text-red-700",
  LOSS: "font-semibold text-green-700",
  UNKNOWN: "font-semibold text-text-secondary",
} as const;

/** Latest Results table — static classes referenced directly in TodayBetaPage TSX. */
export const LATEST_RESULT_WIN_CLASS = RESULT_OUTCOME_TONE_CLASS.WIN;
export const LATEST_RESULT_LOSS_CLASS = RESULT_OUTCOME_TONE_CLASS.LOSS;
export const LATEST_RESULT_UNKNOWN_CLASS = RESULT_OUTCOME_TONE_CLASS.UNKNOWN;

function tournamentDateSortKey(tournamentDate: string | undefined): number | null {
  if (!tournamentDate?.trim()) return null;
  const parsed = parseDisplayDate(tournamentDate);
  if (!parsed) return null;
  return parsed.getTime();
}

export function compareResultsByRecency(a: RecruitMatchResult, b: RecruitMatchResult): number {
  const keyA = tournamentDateSortKey(a.tournamentDate);
  const keyB = tournamentDateSortKey(b.tournamentDate);

  if (keyA === null && keyB === null) {
    return Date.parse(b.firstDetectedAt) - Date.parse(a.firstDetectedAt);
  }
  if (keyA === null) return 1;
  if (keyB === null) return -1;
  if (keyB !== keyA) return keyB - keyA;

  return Date.parse(b.firstDetectedAt) - Date.parse(a.firstDetectedAt);
}

export function sortResultsByRecency(results: readonly RecruitMatchResult[]): RecruitMatchResult[] {
  return [...results].sort(compareResultsByRecency);
}

export function pickLatestResult(
  results: readonly RecruitMatchResult[],
): RecruitMatchResult | null {
  return sortResultsByRecency(results)[0] ?? null;
}

export function compareLatestResultEntries(a: LatestResultEntry, b: LatestResultEntry): number {
  return compareResultsByRecency(a.result, b.result);
}

export function sortLatestResultEntries(entries: readonly LatestResultEntry[]): LatestResultEntry[] {
  return [...entries].sort(compareLatestResultEntries);
}

export function compareLatestResultRows(a: LatestResultRow, b: LatestResultRow): number {
  const latestA = a.latestResult;
  const latestB = b.latestResult;

  if (!latestA && !latestB) {
    return a.recruitName.localeCompare(b.recruitName);
  }
  if (!latestA) return 1;
  if (!latestB) return -1;

  const byRecency = compareLatestResultEntries(latestA, latestB);
  if (byRecency !== 0) return byRecency;

  return a.recruitName.localeCompare(b.recruitName);
}

export function sortLatestResultRows(rows: readonly LatestResultRow[]): LatestResultRow[] {
  return [...rows].sort(compareLatestResultRows);
}

/** Up to four additional stored results for expand (excludes the primary latest row). */
export function additionalRecentResults(row: LatestResultRow): LatestResultEntry[] {
  return row.recentResults.slice(1);
}

export function resultOutcomeLabel(result: MatchResultOutcome): string {
  if (result === "WIN") return "Win";
  if (result === "LOSS") return "Loss";
  return "Unknown";
}

export function resultOutcomeToneClass(result: MatchResultOutcome): string {
  return RESULT_OUTCOME_TONE_CLASS[result];
}

export function formatCompactMatchDate(result: RecruitMatchResult): string {
  const raw = result.tournamentDate ?? result.tournamentDateRaw;
  if (!raw) return "Unknown";
  const date = parseDisplayDate(raw);
  if (!date) return raw;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  }).format(date);
}

export function formatOpponentRankLabel(ranking?: string): string {
  if (!ranking || ranking.trim().toUpperCase() === "UNKNOWN") return "Unknown";
  return `#${ranking.replace(/[^\d]/g, "")}`;
}

export function recruitHasActivityInLastDays(
  results: readonly RecruitMatchResult[],
  windowDays: number,
  now: Date = new Date(),
): boolean {
  const sorted = sortResultsByRecency(results);
  const latest = sorted[0];
  if (!latest?.tournamentDate) return false;

  const matchDay = new Date(`${latest.tournamentDate}T00:00:00`);
  const daysSince = calendarDaysBetween(matchDay, now);
  return daysSince >= 0 && daysSince <= windowDays;
}
