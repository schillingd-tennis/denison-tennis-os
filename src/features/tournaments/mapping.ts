import {
  ATTENDANCE_STATUSES,
  RECRUITING_PLANS,
  TOURNAMENT_STATUSES,
  type AttendanceStatus,
  type RecruitingPlan,
  isTravelMethod,
  type Tournament,
  type TournamentInput,
  type TournamentLinkedRecruit,
  type TournamentLifecycleStatus,
  type TournamentStatus,
} from "./types";

export type RecruitingTournamentRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  venue: string | null;
  surface: string | null;
  status: string;
  recruiting_plan?: string | null;
  website_url: string | null;
  notes: string | null;
  source_key: string | null;
  attended?: boolean | null;
  level?: string | null;
  entry_type?: string | null;
  lifecycle_status?: string | null;
  distance_from_columbus?: string | null;
  additional_notes?: string | null;
  recruits_attending_text?: string | null;
  estimated_drive_time?: string | null;
  travel_method?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  hotel_name?: string | null;
  hotel_address?: string | null;
  hotel_confirmation?: string | null;
  hotel_check_in?: string | null;
  hotel_check_out?: string | null;
  airport?: string | null;
  flight_info?: string | null;
  rental_car?: string | null;
  draws_url?: string | null;
  usta_url?: string | null;
  schedule_url?: string | null;
  results_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type RecruitingTournamentRecruitRow = {
  id: string;
  tournament_id: string;
  recruit_person_id: string;
  attendance_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function isTournamentStatus(value: string): value is TournamentStatus {
  return (TOURNAMENT_STATUSES as readonly string[]).includes(value);
}

export function isRecruitingPlan(value: string): value is RecruitingPlan {
  return (RECRUITING_PLANS as readonly string[]).includes(value);
}

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

export function isLifecycleStatus(value: string): value is TournamentLifecycleStatus {
  return value === "past" || value === "upcoming";
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  return `https://${trimmed}`;
}

/** Trim and validate a tournament write. Operational status is independent of recruiting plan. */
export function normalizeTournamentInput(input: TournamentInput): TournamentInput | { error: string } {
  const name = input.name.trim();
  if (!name) return { error: "Tournament name is required." };
  if (!isTournamentStatus(input.status)) return { error: "Choose a valid operational status." };
  if (!isRecruitingPlan(input.recruitingPlan)) return { error: "Choose a recruiting plan." };
  if (input.lifecycleStatus && !isLifecycleStatus(input.lifecycleStatus)) {
    return { error: "Choose a valid tournament status." };
  }
  const travelMethod = emptyToNull(input.travelMethod);
  if (travelMethod && !isTravelMethod(travelMethod)) {
    return { error: "Choose a valid travel method." };
  }
  const departureDate = emptyToNull(input.departureDate);
  const returnDate = emptyToNull(input.returnDate);
  if (departureDate && returnDate && returnDate < departureDate) {
    return { error: "Return date cannot be before the departure date." };
  }
  const hotelCheckIn = emptyToNull(input.hotelCheckIn);
  const hotelCheckOut = emptyToNull(input.hotelCheckOut);
  if (hotelCheckIn && hotelCheckOut && hotelCheckOut < hotelCheckIn) {
    return { error: "Hotel check-out cannot be before check-in." };
  }

  return {
    name,
    startDate: emptyToNull(input.startDate),
    endDate: emptyToNull(input.endDate),
    location: emptyToNull(input.location),
    venue: emptyToNull(input.venue),
    surface: emptyToNull(input.surface),
    status: input.status,
    recruitingPlan: input.recruitingPlan,
    websiteUrl: normalizeWebsiteUrl(input.websiteUrl),
    notes: emptyToNull(input.notes),
    attended: input.attended,
    level: emptyToNull(input.level),
    entryType: emptyToNull(input.entryType),
    lifecycleStatus: input.lifecycleStatus ?? null,
    distanceFromColumbus: emptyToNull(input.distanceFromColumbus),
    additionalNotes: emptyToNull(input.additionalNotes),
    recruitsAttendingText: emptyToNull(input.recruitsAttendingText),
    estimatedDriveTime: emptyToNull(input.estimatedDriveTime),
    travelMethod: travelMethod && isTravelMethod(travelMethod) ? travelMethod : null,
    departureDate,
    returnDate,
    hotelName: emptyToNull(input.hotelName),
    hotelAddress: emptyToNull(input.hotelAddress),
    hotelConfirmation: emptyToNull(input.hotelConfirmation),
    hotelCheckIn,
    hotelCheckOut,
    airport: emptyToNull(input.airport),
    flightInfo: emptyToNull(input.flightInfo),
    rentalCar: emptyToNull(input.rentalCar),
    drawsUrl: normalizeWebsiteUrl(input.drawsUrl),
    ustaUrl: normalizeWebsiteUrl(input.ustaUrl),
    scheduleUrl: normalizeWebsiteUrl(input.scheduleUrl),
    resultsUrl: normalizeWebsiteUrl(input.resultsUrl),
  };
}

export function recruitingPlanFromStatus(status: TournamentStatus): RecruitingPlan {
  if (status === "confirmed") return "traveling";
  if (status === "completed") return "completed";
  return "watching";
}

export function statusFromRecruitingPlan(
  plan: RecruitingPlan,
  current: TournamentStatus,
): TournamentStatus {
  if (plan === "traveling") return "confirmed";
  if (plan === "completed") return "completed";
  if (current === "cancelled") return current;
  return "planned";
}

export function rowToTournament(
  row: RecruitingTournamentRow,
  linkedRecruits: TournamentLinkedRecruit[] = [],
): Tournament {
  const status = isTournamentStatus(row.status) ? row.status : "planned";
  const rawPlan = row.recruiting_plan ?? "";
  const recruitingPlan = isRecruitingPlan(rawPlan)
    ? rawPlan
    : recruitingPlanFromStatus(status);
  const rawLifecycle = row.lifecycle_status ?? "";
  const lifecycleStatus = isLifecycleStatus(rawLifecycle) ? rawLifecycle : null;

  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    venue: row.venue,
    surface: row.surface,
    status,
    recruitingPlan,
    websiteUrl: row.website_url,
    notes: row.notes,
    sourceKey: row.source_key,
    attended: row.attended ?? null,
    level: row.level ?? null,
    entryType: row.entry_type ?? null,
    lifecycleStatus,
    distanceFromColumbus: row.distance_from_columbus ?? null,
    additionalNotes: row.additional_notes ?? null,
    recruitsAttendingText: row.recruits_attending_text ?? null,
    estimatedDriveTime: row.estimated_drive_time ?? null,
    travelMethod: row.travel_method && isTravelMethod(row.travel_method) ? row.travel_method : null,
    departureDate: row.departure_date ?? null,
    returnDate: row.return_date ?? null,
    hotelName: row.hotel_name ?? null,
    hotelAddress: row.hotel_address ?? null,
    hotelConfirmation: row.hotel_confirmation ?? null,
    hotelCheckIn: row.hotel_check_in ?? null,
    hotelCheckOut: row.hotel_check_out ?? null,
    airport: row.airport ?? null,
    flightInfo: row.flight_info ?? null,
    rentalCar: row.rental_car ?? null,
    drawsUrl: row.draws_url ?? null,
    ustaUrl: row.usta_url ?? null,
    scheduleUrl: row.schedule_url ?? null,
    resultsUrl: row.results_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedRecruits,
  };
}

export function inputToRow(input: TournamentInput): Record<string, string | boolean | null> {
  return {
    name: input.name.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    location: input.location,
    venue: input.venue,
    surface: input.surface,
    status: input.status,
    recruiting_plan: input.recruitingPlan,
    website_url: input.websiteUrl,
    notes: input.notes,
    attended: input.attended,
    level: input.level,
    entry_type: input.entryType,
    lifecycle_status: input.lifecycleStatus,
    distance_from_columbus: input.distanceFromColumbus,
    additional_notes: input.additionalNotes,
    recruits_attending_text: input.recruitsAttendingText,
    estimated_drive_time: input.estimatedDriveTime,
    travel_method: input.travelMethod,
    departure_date: input.departureDate,
    return_date: input.returnDate,
    hotel_name: input.hotelName,
    hotel_address: input.hotelAddress,
    hotel_confirmation: input.hotelConfirmation,
    hotel_check_in: input.hotelCheckIn,
    hotel_check_out: input.hotelCheckOut,
    airport: input.airport,
    flight_info: input.flightInfo,
    rental_car: input.rentalCar,
    draws_url: input.drawsUrl,
    usta_url: input.ustaUrl,
    schedule_url: input.scheduleUrl,
    results_url: input.resultsUrl,
  };
}

export function attendanceFromRow(row: RecruitingTournamentRecruitRow): AttendanceStatus {
  return isAttendanceStatus(row.attendance_status) ? row.attendance_status : "expected";
}
