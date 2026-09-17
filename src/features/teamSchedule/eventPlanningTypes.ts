export const PARTY_MEMBER_KINDS = ["player", "coach", "additional"] as const;
export type PartyMemberKind = (typeof PARTY_MEMBER_KINDS)[number];

export const PARTY_MEMBER_KIND_LABELS: Record<PartyMemberKind, string> = {
  player: "Player",
  coach: "Coach",
  additional: "Additional",
};

export const TRAVEL_MODES = ["van", "flight", "bus", "ground_transfer"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  van: "Van",
  flight: "Flight",
  bus: "Bus",
  ground_transfer: "Ground transfer",
};

export const SESSION_TYPES = ["practice", "match", "activity"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  practice: "Practice",
  match: "Match",
  activity: "Activity",
};

export const ALUMNI_RSVP_STATUSES = ["invited", "confirmed", "unable"] as const;
export type AlumniRsvpStatus = (typeof ALUMNI_RSVP_STATUSES)[number];

export const ALUMNI_RSVP_LABELS: Record<AlumniRsvpStatus, string> = {
  invited: "Invited",
  confirmed: "Confirmed",
  unable: "Unable",
};

export type SchedulePartyMember = {
  id: string;
  eventId: string;
  personId: string;
  memberKind: PartyMemberKind;
  notes: string | null;
  sortOrder: number;
  displayName: string;
  initials: string;
  photoUrl?: string;
  classYear?: number;
};

export type ScheduleEventTeam = {
  id: string;
  eventId: string;
  teamName: string;
  identitySlug: string | null;
  sortOrder: number;
};

export type ScheduleTravelArrangement = {
  id: string;
  eventId: string;
  travelMode: TravelMode;
  label: string | null;
  departureDate: string | null;
  departureTime: string | null;
  departureTimezone: string | null;
  returnDate: string | null;
  returnTime: string | null;
  returnTimezone: string | null;
  origin: string | null;
  destination: string | null;
  provider: string | null;
  confirmation: string | null;
  notes: string | null;
  vehicleName: string | null;
  driverPersonId: string | null;
  airline: string | null;
  flightNumber: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  sortOrder: number;
  passengerPersonIds: string[];
};

export type ScheduleTravelArrangementInput = Omit<
  ScheduleTravelArrangement,
  "id" | "eventId" | "passengerPersonIds"
> & {
  passengerPersonIds?: readonly string[];
};

export type ScheduleEventSession = {
  id: string;
  eventId: string;
  sessionType: SessionType;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  venueOrCourt: string | null;
  notes: string | null;
  sortOrder: number;
};

export type ScheduleEventSessionInput = Omit<ScheduleEventSession, "id" | "eventId">;

export type ScheduleAlumniAttendee = {
  id: string;
  eventId: string;
  personId: string | null;
  guestName: string | null;
  classYear: number | null;
  rsvpStatus: AlumniRsvpStatus;
  guestCount: number;
  notes: string | null;
  sortOrder: number;
  displayName: string;
};

export type ScheduleAlumniAttendeeInput = {
  personId?: string | null;
  guestName?: string | null;
  classYear?: number | null;
  rsvpStatus?: AlumniRsvpStatus;
  guestCount?: number;
  notes?: string | null;
  sortOrder?: number;
};

export type SchedulePackingItem = {
  id: string;
  eventId: string;
  itemName: string;
  quantity: number;
  responsible: string | null;
  notes: string | null;
  isChecked: boolean;
  isStarter: boolean;
  sortOrder: number;
};

export type SchedulePackingItemInput = {
  itemName: string;
  quantity?: number;
  responsible?: string | null;
  notes?: string | null;
  isChecked?: boolean;
  isStarter?: boolean;
  sortOrder?: number;
};

export type ScheduleEventPlanningNotes = {
  eventId: string;
  notes: string | null;
  updatedAt: string | null;
};

export type ScheduleEventPlanningBundle = {
  party: SchedulePartyMember[];
  teams: ScheduleEventTeam[];
  travel: ScheduleTravelArrangement[];
  sessions: ScheduleEventSession[];
  alumni: ScheduleAlumniAttendee[];
  packing: SchedulePackingItem[];
  planning: ScheduleEventPlanningNotes;
};

export type ScheduleRosterCandidate = {
  id: string;
  displayName: string;
  initials: string;
  photoUrl?: string;
  classYear?: number;
  kind: PartyMemberKind;
  secondary?: string;
};
