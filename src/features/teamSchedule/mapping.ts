import {
  DOUBLEHEADER_STATUSES,
  SCHEDULE_EVENT_TYPES,
  SCHEDULE_STATUSES,
  SEASON_SEGMENTS,
  SITE_DESIGNATIONS,
  type DoubleheaderStatus,
  type ScheduleEventType,
  type ScheduleStatus,
  type SeasonSegment,
  type SiteDesignation,
  type TeamScheduleEvent,
  type TeamScheduleEventInput,
} from "./types";

export type TeamScheduleEventRow = {
  id: string;
  season_year: number;
  competition_date_number: number | null;
  competition_date_group: string | null;
  event_type: string;
  opponent_name: string | null;
  event_name: string | null;
  ita_rank: number | null;
  start_date: string;
  end_date: string;
  time_text: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  location_text: string | null;
  site_designation: string;
  travel_required: boolean;
  ncac: boolean;
  season_segment: string;
  status: string;
  doubleheader_status: string;
  officials_needed: number | null;
  teams_in_event: string | null;
  counts_as_competition_date: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function parseEnum<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function rowToScheduleEvent(row: TeamScheduleEventRow): TeamScheduleEvent {
  const eventType = parseEnum(row.event_type, SCHEDULE_EVENT_TYPES);
  const siteDesignation = parseEnum(row.site_designation, SITE_DESIGNATIONS);
  const seasonSegment = parseEnum(row.season_segment, SEASON_SEGMENTS);
  const status = parseEnum(row.status, SCHEDULE_STATUSES);
  const doubleheaderStatus = parseEnum(row.doubleheader_status, DOUBLEHEADER_STATUSES);

  if (!eventType || !siteDesignation || !seasonSegment || !status || !doubleheaderStatus) {
    throw new Error(`Invalid schedule event row ${row.id}`);
  }

  return {
    id: row.id,
    seasonYear: row.season_year,
    competitionDateNumber: row.competition_date_number,
    competitionDateGroup: row.competition_date_group,
    eventType,
    opponentName: row.opponent_name,
    eventName: row.event_name,
    itaRank: row.ita_rank,
    startDate: row.start_date,
    endDate: row.end_date,
    timeText: row.time_text,
    venueName: row.venue_name,
    city: row.city,
    state: row.state,
    locationText: row.location_text,
    siteDesignation,
    travelRequired: row.travel_required,
    ncac: row.ncac,
    seasonSegment,
    status,
    doubleheaderStatus,
    officialsNeeded: row.officials_needed,
    teamsInEvent: row.teams_in_event,
    countsAsCompetitionDate: row.counts_as_competition_date,
    notes: row.notes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function inputToRow(input: TeamScheduleEventInput): Omit<TeamScheduleEventRow, "id" | "created_at" | "updated_at"> {
  return {
    season_year: input.seasonYear,
    competition_date_number: input.competitionDateNumber,
    competition_date_group: input.competitionDateGroup,
    event_type: input.eventType,
    opponent_name: input.opponentName,
    event_name: input.eventName,
    ita_rank: input.itaRank,
    start_date: input.startDate,
    end_date: input.endDate,
    time_text: input.timeText,
    venue_name: input.venueName,
    city: input.city,
    state: input.state,
    location_text: input.locationText,
    site_designation: input.siteDesignation,
    travel_required: input.travelRequired,
    ncac: input.ncac,
    season_segment: input.seasonSegment,
    status: input.status,
    doubleheader_status: input.doubleheaderStatus,
    officials_needed: input.officialsNeeded,
    teams_in_event: input.teamsInEvent,
    counts_as_competition_date: input.countsAsCompetitionDate,
    notes: input.notes,
    sort_order: input.sortOrder,
  };
}

export type NormalizedScheduleInput = TeamScheduleEventInput;

export function normalizeScheduleInput(raw: Partial<TeamScheduleEventInput>): { input: NormalizedScheduleInput } | { error: string } {
  const eventType = raw.eventType;
  if (!eventType || !parseEnum(eventType, SCHEDULE_EVENT_TYPES)) {
    return { error: "Select an event type." };
  }
  const siteDesignation = raw.siteDesignation;
  if (!siteDesignation || !parseEnum(siteDesignation, SITE_DESIGNATIONS)) {
    return { error: "Select a site designation." };
  }
  const seasonSegment = raw.seasonSegment;
  if (!seasonSegment || !parseEnum(seasonSegment, SEASON_SEGMENTS)) {
    return { error: "Select a season segment." };
  }
  const status = raw.status ?? "confirmed";
  if (!parseEnum(status, SCHEDULE_STATUSES)) {
    return { error: "Select a valid status." };
  }
  const doubleheaderStatus = raw.doubleheaderStatus ?? "none";
  if (!parseEnum(doubleheaderStatus, DOUBLEHEADER_STATUSES)) {
    return { error: "Select a valid doubleheader status." };
  }
  if (!raw.startDate?.trim()) return { error: "Start date is required." };
  if (!raw.endDate?.trim()) return { error: "End date is required." };
  if (raw.endDate < raw.startDate) return { error: "End date must be on or after start date." };
  if (!raw.seasonYear || raw.seasonYear < 2000) return { error: "Season year is required." };

  const opponentName = raw.opponentName?.trim() || null;
  const eventName = raw.eventName?.trim() || null;
  if (!opponentName && !eventName) {
    return { error: "Enter an opponent or event name." };
  }

  const countsAsCompetitionDate = raw.countsAsCompetitionDate ?? true;
  const competitionDateNumber = countsAsCompetitionDate ? raw.competitionDateNumber ?? null : null;
  if (countsAsCompetitionDate && competitionDateNumber == null) {
    return { error: "Competition date number is required when the event counts as a competition date." };
  }

  return {
    input: {
      seasonYear: raw.seasonYear,
      competitionDateNumber,
      competitionDateGroup: countsAsCompetitionDate
        ? raw.competitionDateGroup?.trim() || (competitionDateNumber != null ? String(competitionDateNumber) : null)
        : null,
      eventType,
      opponentName,
      eventName,
      itaRank: raw.itaRank ?? null,
      startDate: raw.startDate,
      endDate: raw.endDate,
      timeText: raw.timeText?.trim() || null,
      venueName: raw.venueName?.trim() || null,
      city: raw.city?.trim() || null,
      state: raw.state?.trim() || null,
      locationText: raw.locationText?.trim() || null,
      siteDesignation,
      travelRequired: raw.travelRequired ?? false,
      ncac: raw.ncac ?? false,
      seasonSegment,
      status,
      doubleheaderStatus,
      officialsNeeded: raw.officialsNeeded ?? null,
      teamsInEvent: raw.teamsInEvent?.trim() || null,
      countsAsCompetitionDate,
      notes: raw.notes?.trim() || null,
      sortOrder: raw.sortOrder ?? 0,
    },
  };
}

export function isScheduleEventType(value: string): value is ScheduleEventType {
  return (SCHEDULE_EVENT_TYPES as readonly string[]).includes(value);
}

export function isSiteDesignation(value: string): value is SiteDesignation {
  return (SITE_DESIGNATIONS as readonly string[]).includes(value);
}

export function isSeasonSegment(value: string): value is SeasonSegment {
  return (SEASON_SEGMENTS as readonly string[]).includes(value);
}

export function isScheduleStatus(value: string): value is ScheduleStatus {
  return (SCHEDULE_STATUSES as readonly string[]).includes(value);
}

export function isDoubleheaderStatus(value: string): value is DoubleheaderStatus {
  return (DOUBLEHEADER_STATUSES as readonly string[]).includes(value);
}
