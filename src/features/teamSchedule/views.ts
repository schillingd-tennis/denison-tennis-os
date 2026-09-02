import type { TeamScheduleEvent } from "./types";
import { isTeamMatchType, isTournamentOrEventType } from "./types";
import type { ScheduleViewMode } from "./directorySessionState";

export function scheduleViewMatches(view: ScheduleViewMode, event: TeamScheduleEvent): boolean {
  switch (view) {
    case "all":
      return true;
    case "fall":
      return event.seasonSegment === "fall";
    case "spring":
      return event.seasonSegment === "spring";
    case "ncac":
      return event.ncac;
    case "nonConference":
      return !event.ncac && isTeamMatchType(event.eventType);
    case "home":
      return event.siteDesignation === "home";
    case "away":
      return event.siteDesignation === "away";
    case "neutral":
      return event.siteDesignation === "neutral";
    case "events":
      return isTournamentOrEventType(event.eventType);
    case "tentative":
      return event.status === "tentative" || event.status === "tbd";
    case "doubleheaders":
      return event.doubleheaderStatus !== "none";
    default:
      return true;
  }
}

export function scheduleViewContextLabel(view: ScheduleViewMode): string {
  const option = [
    { value: "all", label: "All Matches" },
    { value: "fall", label: "Fall Schedule" },
    { value: "spring", label: "Spring Schedule" },
    { value: "ncac", label: "NCAC Matches" },
    { value: "nonConference", label: "Non-Conference Matches" },
    { value: "home", label: "Home Matches" },
    { value: "away", label: "Away Matches" },
    { value: "neutral", label: "Neutral Site Matches" },
    { value: "events", label: "Tournaments & Events" },
    { value: "tentative", label: "Tentative & TBD" },
    { value: "doubleheaders", label: "Doubleheader Opportunities" },
  ].find((entry) => entry.value === view);
  return option?.label ?? "All Matches";
}
