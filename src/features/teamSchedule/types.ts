export const SCHEDULE_EVENT_TYPES = [
  "team_match",
  "tournament",
  "non_team_event",
  "team_match_placeholder",
] as const;
export type ScheduleEventType = (typeof SCHEDULE_EVENT_TYPES)[number];

export const SITE_DESIGNATIONS = ["home", "away", "neutral"] as const;
export type SiteDesignation = (typeof SITE_DESIGNATIONS)[number];

export const SEASON_SEGMENTS = ["fall", "spring", "postseason"] as const;
export type SeasonSegment = (typeof SEASON_SEGMENTS)[number];

export const SCHEDULE_STATUSES = ["confirmed", "tentative", "tbd", "cancelled"] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const DOUBLEHEADER_STATUSES = ["none", "potential", "confirmed"] as const;
export type DoubleheaderStatus = (typeof DOUBLEHEADER_STATUSES)[number];

export const SCHEDULE_EVENT_TYPE_LABELS: Record<ScheduleEventType, string> = {
  team_match: "Team Match",
  tournament: "Tournament",
  non_team_event: "Non-Team Event",
  team_match_placeholder: "Placeholder",
};

export const SITE_DESIGNATION_LABELS: Record<SiteDesignation, string> = {
  home: "Home",
  away: "Away",
  neutral: "Neutral",
};

export const SEASON_SEGMENT_LABELS: Record<SeasonSegment, string> = {
  fall: "Fall",
  spring: "Spring",
  postseason: "Postseason",
};

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  tbd: "TBD",
  cancelled: "Cancelled",
};

export const DOUBLEHEADER_STATUS_LABELS: Record<DoubleheaderStatus, string> = {
  none: "None",
  potential: "Potential",
  confirmed: "Confirmed",
};

export type TeamScheduleEvent = {
  id: string;
  seasonYear: number;
  competitionDateNumber: number | null;
  competitionDateGroup: string | null;
  eventType: ScheduleEventType;
  opponentName: string | null;
  eventName: string | null;
  itaRank: number | null;
  startDate: string;
  endDate: string;
  timeText: string | null;
  venueName: string | null;
  city: string | null;
  state: string | null;
  locationText: string | null;
  siteDesignation: SiteDesignation;
  travelRequired: boolean;
  ncac: boolean;
  seasonSegment: SeasonSegment;
  status: ScheduleStatus;
  doubleheaderStatus: DoubleheaderStatus;
  officialsNeeded: number | null;
  teamsInEvent: string | null;
  countsAsCompetitionDate: boolean;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TeamScheduleEventInput = Omit<
  TeamScheduleEvent,
  "id" | "createdAt" | "updatedAt"
>;

export type ScheduleKpis = {
  countableDates: number;
  teamMatches: number;
  ncacMatches: number;
  home: number;
  away: number;
  neutral: number;
  tentativeOrTbd: number;
  tournamentsAndEvents: number;
};

export function formatSeasonLabel(seasonYear: number): string {
  const start = seasonYear - 1;
  const endSuffix = String(seasonYear).slice(-2);
  return `${start}–${endSuffix} Season`;
}

export function displayOpponentOrEvent(event: TeamScheduleEvent): string {
  return event.opponentName ?? event.eventName ?? "—";
}

export function isTeamMatchType(eventType: ScheduleEventType): boolean {
  return eventType === "team_match" || eventType === "team_match_placeholder";
}

export function isTournamentOrEventType(eventType: ScheduleEventType): boolean {
  return eventType === "tournament" || eventType === "non_team_event";
}
