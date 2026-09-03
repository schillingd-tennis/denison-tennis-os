import { formatDate } from "@/lib/formatting";

import { matchParticipantIds } from "./matchPlayers";
import { isTodayLocalDate } from "./dates";
import type { IntraSquadMatch } from "./types";

export function formatPlayedAtLabel(playedAt: string, now: Date = new Date()): string {
  const formatted = formatDate(playedAt);
  if (isTodayLocalDate(playedAt, now)) return `Today · ${formatted}`;
  return formatted;
}

export function formatMatchDateHeading(playedAt: string, now: Date = new Date()): string {
  return formatPlayedAtLabel(playedAt, now);
}

export function averageMatchWeight(matches: readonly IntraSquadMatch[]): number | null {
  if (matches.length === 0) return null;
  const total = matches.reduce((sum, match) => sum + match.weight, 0);
  return total / matches.length;
}

export function lastMatch(matches: readonly IntraSquadMatch[]): IntraSquadMatch | null {
  return sortMatchesNewestFirst(matches)[0] ?? null;
}

export function sortMatchesNewestFirst(matches: readonly IntraSquadMatch[]): IntraSquadMatch[] {
  return [...matches].sort((a, b) => {
    if (a.playedAt !== b.playedAt) return a.playedAt < b.playedAt ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

export function uniquePlayerCount(matches: readonly IntraSquadMatch[]): number {
  return new Set(matches.flatMap((match) => matchParticipantIds(match).filter(Boolean))).size;
}

export function intraSquadDashboardStats(matches: readonly IntraSquadMatch[]) {
  const ordered = sortMatchesNewestFirst(matches);
  return {
    totalMatches: ordered.length,
    activePlayers: uniquePlayerCount(ordered),
    avgMatchWeight: averageMatchWeight(ordered),
    lastMatch: lastMatch(ordered),
  };
}

export function intraSquadTabHref(tab: string): string {
  if (!tab || tab === "dashboard") return "/team-operations/intra-squad";
  return `/team-operations/intra-squad?tab=${tab}`;
}

export function parseIntraSquadTab(raw: string | undefined): import("./types").IntraSquadTab {
  if (
    raw === "match-log" ||
    raw === "rankings" ||
    raw === "player-records" ||
    raw === "match-value" ||
    raw === "elo"
  ) {
    return raw;
  }
  return "dashboard";
}
