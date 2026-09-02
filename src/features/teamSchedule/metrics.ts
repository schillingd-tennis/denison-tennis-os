import type { ScheduleKpis, TeamScheduleEvent } from "./types";
import { isTeamMatchType, isTournamentOrEventType } from "./types";

export function computeScheduleKpis(events: readonly TeamScheduleEvent[]): ScheduleKpis {
  const countableDateNumbers = new Set<number>();
  let teamMatches = 0;
  let ncacMatches = 0;
  let home = 0;
  let away = 0;
  let neutral = 0;
  let tentativeOrTbd = 0;
  let tournamentsAndEvents = 0;

  for (const event of events) {
    if (event.countsAsCompetitionDate && event.competitionDateNumber != null) {
      countableDateNumbers.add(event.competitionDateNumber);
    }
    if (isTeamMatchType(event.eventType)) teamMatches += 1;
    if (event.ncac) ncacMatches += 1;
    if (event.siteDesignation === "home") home += 1;
    else if (event.siteDesignation === "away") away += 1;
    else neutral += 1;
    if (event.status === "tentative" || event.status === "tbd") tentativeOrTbd += 1;
    if (isTournamentOrEventType(event.eventType)) tournamentsAndEvents += 1;
  }

  return {
    countableDates: countableDateNumbers.size,
    teamMatches,
    ncacMatches,
    home,
    away,
    neutral,
    tentativeOrTbd,
    tournamentsAndEvents,
  };
}

export function countSharedDateGroups(events: readonly TeamScheduleEvent[]): number {
  const groups = new Set<string>();
  for (const event of events) {
    if (event.competitionDateGroup) groups.add(event.competitionDateGroup);
  }
  return [...groups].filter((group) => events.filter((e) => e.competitionDateGroup === group).length > 1).length;
}
