import {
  MATCHES_ROUTE,
  matchesEventPath,
  matchesPlayerPath,
  matchesPairPath,
} from "@/lib/module-routes";

import { formatRecord } from "./scoringRules";
import { rosterPlayerDisplayName } from "./resolvePlayers";
import {
  MATCHES_TABS,
  type MatchEvent,
  type MatchResult,
  type MatchesTab,
  type RosterPlayer,
  type TeamOutcome,
} from "./types";

export function parseMatchesTab(value: string | undefined | null): MatchesTab {
  if (value && (MATCHES_TABS as readonly string[]).includes(value)) {
    return value as MatchesTab;
  }
  return "team";
}

export function matchesTabHref(tab: MatchesTab): string {
  return tab === "team" ? MATCHES_ROUTE : `${MATCHES_ROUTE}?tab=${tab}`;
}

export function formatSeasonLabel(seasonYear: number): string {
  return `${seasonYear - 1}–${String(seasonYear).slice(-2)} Season`;
}

export function eventDisplayTitle(
  event: MatchEvent,
  schedule?: { opponentName: string | null; eventName: string | null } | null,
): string {
  if (schedule) {
    return schedule.opponentName ?? schedule.eventName ?? event.title;
  }
  if (event.scheduleSnapshot && !event.scheduleEventId) {
    return (
      event.scheduleSnapshot.opponentName ??
      event.scheduleSnapshot.eventName ??
      event.title
    );
  }
  if (event.eventType === "dual") {
    return event.opposingTeamName?.trim() || event.title;
  }
  return event.title;
}

export function formatTeamScore(event: MatchEvent): string {
  if (event.eventType !== "dual") return "—";
  const d = event.reportedTeamScoreDenison ?? event.calculatedTeamScoreDenison;
  const o = event.reportedTeamScoreOpponent ?? event.calculatedTeamScoreOpponent;
  if (d == null || o == null) return "—";
  return `${d}–${o}`;
}

export function formatTeamOutcome(outcome: TeamOutcome | null): string {
  if (outcome === "win") return "W";
  if (outcome === "loss") return "L";
  if (outcome === "tie") return "T";
  return "—";
}

export function formatOpponentLine(result: MatchResult): string {
  const names = [result.opponentPlayerAName, result.opponentPlayerBName].filter(Boolean).join(" / ");
  if (!names) return result.opponentSchool ?? "—";
  return result.opponentSchool ? `${names} (${result.opponentSchool})` : names;
}

export function playerNameFor(
  playerId: string | null | undefined,
  roster: readonly RosterPlayer[],
): string {
  if (!playerId) return "—";
  const player = roster.find((p) => p.id === playerId);
  return player ? rosterPlayerDisplayName(player) : playerId;
}

export function pairDisplayName(
  playerAId: string,
  playerBId: string,
  roster: readonly RosterPlayer[],
): string {
  return `${playerNameFor(playerAId, roster)} / ${playerNameFor(playerBId, roster)}`;
}

export {
  MATCHES_ROUTE,
  matchesEventPath,
  matchesPlayerPath,
  matchesPairPath,
  formatRecord,
};
