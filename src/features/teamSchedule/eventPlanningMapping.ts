import {
  ALUMNI_RSVP_STATUSES,
  PARTY_MEMBER_KINDS,
  SESSION_TYPES,
  TRAVEL_MODES,
  type AlumniRsvpStatus,
  type PartyMemberKind,
  type ScheduleAlumniAttendee,
  type ScheduleEventSession,
  type ScheduleEventTeam,
  type SchedulePackingItem,
  type SchedulePartyMember,
  type ScheduleTravelArrangement,
  type SessionType,
  type TravelMode,
} from "./eventPlanningTypes";

function parseEnum<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export type PartyRow = {
  id: string;
  event_id: string;
  person_id: string;
  member_kind: string;
  notes: string | null;
  sort_order: number;
};

export type TeamRow = {
  id: string;
  event_id: string;
  team_name: string;
  identity_slug: string | null;
  sort_order: number;
};

export type TravelRow = {
  id: string;
  event_id: string;
  travel_mode: string;
  label: string | null;
  departure_date: string | null;
  departure_time: string | null;
  departure_timezone: string | null;
  return_date: string | null;
  return_time: string | null;
  return_timezone: string | null;
  origin: string | null;
  destination: string | null;
  provider: string | null;
  confirmation: string | null;
  notes: string | null;
  vehicle_name: string | null;
  driver_person_id: string | null;
  airline: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  sort_order: number;
};

export type SessionRow = {
  id: string;
  event_id: string;
  session_type: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_or_court: string | null;
  notes: string | null;
  sort_order: number;
};

export type AlumniRow = {
  id: string;
  event_id: string;
  person_id: string | null;
  guest_name: string | null;
  class_year: number | null;
  rsvp_status: string;
  guest_count: number;
  notes: string | null;
  sort_order: number;
};

export type PackingRow = {
  id: string;
  event_id: string;
  item_name: string;
  quantity: number;
  responsible: string | null;
  notes: string | null;
  is_checked: boolean;
  is_starter: boolean;
  sort_order: number;
};

export function rowToPartyMember(
  row: PartyRow,
  person?: { displayName: string; initials: string; photoUrl?: string; classYear?: number },
): SchedulePartyMember {
  const memberKind = parseEnum(row.member_kind, PARTY_MEMBER_KINDS) ?? "player";
  return {
    id: row.id,
    eventId: row.event_id,
    personId: row.person_id,
    memberKind,
    notes: row.notes,
    sortOrder: row.sort_order,
    displayName: person?.displayName ?? "Unknown",
    initials: person?.initials ?? "?",
    photoUrl: person?.photoUrl,
    classYear: person?.classYear,
  };
}

export function rowToEventTeam(row: TeamRow): ScheduleEventTeam {
  return {
    id: row.id,
    eventId: row.event_id,
    teamName: row.team_name,
    identitySlug: row.identity_slug,
    sortOrder: row.sort_order,
  };
}

export function rowToTravel(
  row: TravelRow,
  passengerPersonIds: string[] = [],
): ScheduleTravelArrangement {
  const travelMode = parseEnum(row.travel_mode, TRAVEL_MODES) ?? "van";
  return {
    id: row.id,
    eventId: row.event_id,
    travelMode,
    label: row.label,
    departureDate: row.departure_date,
    departureTime: row.departure_time,
    departureTimezone: row.departure_timezone,
    returnDate: row.return_date,
    returnTime: row.return_time,
    returnTimezone: row.return_timezone,
    origin: row.origin,
    destination: row.destination,
    provider: row.provider,
    confirmation: row.confirmation,
    notes: row.notes,
    vehicleName: row.vehicle_name,
    driverPersonId: row.driver_person_id,
    airline: row.airline,
    flightNumber: row.flight_number,
    departureAirport: row.departure_airport,
    arrivalAirport: row.arrival_airport,
    sortOrder: row.sort_order,
    passengerPersonIds,
  };
}

export function travelToRow(
  eventId: string,
  input: Omit<ScheduleTravelArrangement, "id" | "eventId" | "passengerPersonIds"> & {
    travelMode: TravelMode;
  },
) {
  return {
    event_id: eventId,
    travel_mode: input.travelMode,
    label: input.label?.trim() || null,
    departure_date: input.departureDate || null,
    departure_time: input.departureTime?.trim() || null,
    departure_timezone: input.departureTimezone?.trim() || null,
    return_date: input.returnDate || null,
    return_time: input.returnTime?.trim() || null,
    return_timezone: input.returnTimezone?.trim() || null,
    origin: input.origin?.trim() || null,
    destination: input.destination?.trim() || null,
    provider: input.provider?.trim() || null,
    confirmation: input.confirmation?.trim() || null,
    notes: input.notes?.trim() || null,
    vehicle_name: input.vehicleName?.trim() || null,
    driver_person_id: input.driverPersonId || null,
    airline: input.airline?.trim() || null,
    flight_number: input.flightNumber?.trim() || null,
    departure_airport: input.departureAirport?.trim() || null,
    arrival_airport: input.arrivalAirport?.trim() || null,
    sort_order: input.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export function rowToSession(row: SessionRow): ScheduleEventSession {
  const sessionType = parseEnum(row.session_type, SESSION_TYPES) ?? "match";
  return {
    id: row.id,
    eventId: row.event_id,
    sessionType,
    sessionDate: row.session_date,
    startTime: row.start_time,
    endTime: row.end_time,
    venueOrCourt: row.venue_or_court,
    notes: row.notes,
    sortOrder: row.sort_order,
  };
}

export function sessionToRow(eventId: string, input: Omit<ScheduleEventSession, "id" | "eventId">) {
  return {
    event_id: eventId,
    session_type: input.sessionType,
    session_date: input.sessionDate,
    start_time: input.startTime?.trim() || null,
    end_time: input.endTime?.trim() || null,
    venue_or_court: input.venueOrCourt?.trim() || null,
    notes: input.notes?.trim() || null,
    sort_order: input.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export function rowToAlumni(
  row: AlumniRow,
  displayName: string,
): ScheduleAlumniAttendee {
  const rsvpStatus = parseEnum(row.rsvp_status, ALUMNI_RSVP_STATUSES) ?? "invited";
  return {
    id: row.id,
    eventId: row.event_id,
    personId: row.person_id,
    guestName: row.guest_name,
    classYear: row.class_year,
    rsvpStatus,
    guestCount: row.guest_count,
    notes: row.notes,
    sortOrder: row.sort_order,
    displayName,
  };
}

export function rowToPacking(row: PackingRow): SchedulePackingItem {
  return {
    id: row.id,
    eventId: row.event_id,
    itemName: row.item_name,
    quantity: row.quantity,
    responsible: row.responsible,
    notes: row.notes,
    isChecked: row.is_checked,
    isStarter: row.is_starter,
    sortOrder: row.sort_order,
  };
}

export function isTravelMode(value: string): value is TravelMode {
  return (TRAVEL_MODES as readonly string[]).includes(value);
}

export function isSessionType(value: string): value is SessionType {
  return (SESSION_TYPES as readonly string[]).includes(value);
}

export function isPartyMemberKind(value: string): value is PartyMemberKind {
  return (PARTY_MEMBER_KINDS as readonly string[]).includes(value);
}

export function isAlumniRsvp(value: string): value is AlumniRsvpStatus {
  return (ALUMNI_RSVP_STATUSES as readonly string[]).includes(value);
}
