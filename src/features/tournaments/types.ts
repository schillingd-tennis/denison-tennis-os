export const TOURNAMENT_STATUSES = ["planned", "confirmed", "completed", "cancelled"] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const RECRUITING_PLANS = ["traveling", "watching", "considering", "completed"] as const;
export type RecruitingPlan = (typeof RECRUITING_PLANS)[number];

export const ATTENDANCE_STATUSES = ["expected", "confirmed", "watched"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  expected: "Expected",
  confirmed: "Confirmed",
  watched: "Watched",
};

export const RECRUITING_PLAN_LABELS: Record<RecruitingPlan, string> = {
  traveling: "Traveling",
  watching: "Watching",
  considering: "Considering",
  completed: "Completed",
};

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  planned: "Planned",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type TournamentLifecycleStatus = "past" | "upcoming";

export const TOURNAMENT_LIFECYCLE_LABELS: Record<TournamentLifecycleStatus, string> = {
  past: "Past",
  upcoming: "Upcoming",
};

/** Known values from Tournaments.csv; current value is appended in the editor if missing. */
export const TOURNAMENT_LEVEL_OPTIONS = [
  "Showcase",
  "L1",
  "L2",
  "L3 Open",
  "L3 Closed",
  "L4 Open",
  "L4 Closed",
  "L5 Closed",
  "ITF",
  "ITA",
  "OHSAA State",
  "Other",
] as const;

export const TOURNAMENT_ENTRY_TYPE_OPTIONS = ["Open", "Closed", "State"] as const;

export const TOURNAMENT_SURFACE_OPTIONS = ["Hard", "Clay", "Grass", "Indoor"] as const;

export const TRAVEL_METHODS = ["drive", "fly", "drive_fly", "other"] as const;
export type TravelMethod = (typeof TRAVEL_METHODS)[number];

export const TRAVEL_METHOD_LABELS: Record<TravelMethod, string> = {
  drive: "Drive",
  fly: "Fly",
  drive_fly: "Drive / Fly",
  other: "Other",
};

export function isTravelMethod(value: string): value is TravelMethod {
  return (TRAVEL_METHODS as readonly string[]).includes(value);
}

export const EMPTY_TOURNAMENT_TRAVEL_FIELDS = {
  estimatedDriveTime: null,
  travelMethod: null,
  departureDate: null,
  returnDate: null,
  hotelName: null,
  hotelAddress: null,
  hotelConfirmation: null,
  hotelCheckIn: null,
  hotelCheckOut: null,
  airport: null,
  flightInfo: null,
  rentalCar: null,
  drawsUrl: null,
  ustaUrl: null,
  scheduleUrl: null,
  resultsUrl: null,
} as const satisfies Record<string, string | TravelMethod | null>;

export type TournamentLinkedRecruit = {
  personId: string;
  displayName: string;
  initials: string;
  photoUrl?: string;
  recruitClassYear?: number;
  hometown?: string;
  utr?: number;
  trnRank?: number;
  pipelineLabel?: string;
  priorityLabel?: string;
  attendanceStatus: AttendanceStatus;
  notes?: string;
};

export type Tournament = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  venue: string | null;
  surface: string | null;
  status: TournamentStatus;
  recruitingPlan: RecruitingPlan;
  websiteUrl: string | null;
  notes: string | null;
  sourceKey: string | null;
  attended: boolean | null;
  level: string | null;
  entryType: string | null;
  lifecycleStatus: TournamentLifecycleStatus | null;
  distanceFromColumbus: string | null;
  additionalNotes: string | null;
  recruitsAttendingText: string | null;
  estimatedDriveTime: string | null;
  travelMethod: TravelMethod | null;
  departureDate: string | null;
  returnDate: string | null;
  hotelName: string | null;
  hotelAddress: string | null;
  hotelConfirmation: string | null;
  hotelCheckIn: string | null;
  hotelCheckOut: string | null;
  airport: string | null;
  flightInfo: string | null;
  rentalCar: string | null;
  drawsUrl: string | null;
  ustaUrl: string | null;
  scheduleUrl: string | null;
  resultsUrl: string | null;
  createdAt: string;
  updatedAt: string;
  linkedRecruits: TournamentLinkedRecruit[];
};

export type TournamentInput = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  venue: string | null;
  surface: string | null;
  status: TournamentStatus;
  recruitingPlan: RecruitingPlan;
  websiteUrl: string | null;
  notes: string | null;
  attended: boolean | null;
  level: string | null;
  entryType: string | null;
  lifecycleStatus: TournamentLifecycleStatus | null;
  distanceFromColumbus: string | null;
  additionalNotes: string | null;
  recruitsAttendingText: string | null;
  estimatedDriveTime: string | null;
  travelMethod: TravelMethod | null;
  departureDate: string | null;
  returnDate: string | null;
  hotelName: string | null;
  hotelAddress: string | null;
  hotelConfirmation: string | null;
  hotelCheckIn: string | null;
  hotelCheckOut: string | null;
  airport: string | null;
  flightInfo: string | null;
  rentalCar: string | null;
  drawsUrl: string | null;
  ustaUrl: string | null;
  scheduleUrl: string | null;
  resultsUrl: string | null;
};

export type TournamentKpis = {
  travelingTo: number;
  watching: number;
  upcoming: number;
  linkedRecruits: number;
};

export type ListTournamentsResult =
  | { ok: true; tournaments: Tournament[] }
  | { ok: false; error: string };
