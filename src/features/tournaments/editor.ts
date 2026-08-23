import { joinCityState, splitCityState } from "./location";
import { EMPTY_TOURNAMENT_TRAVEL_FIELDS, type Tournament, type TournamentInput } from "./types";

export function tournamentToInput(tournament: Tournament): TournamentInput {
  return {
    name: tournament.name,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    location: tournament.location,
    venue: tournament.venue,
    surface: tournament.surface,
    status: tournament.status,
    recruitingPlan: tournament.recruitingPlan,
    websiteUrl: tournament.websiteUrl,
    notes: tournament.notes,
    attended: tournament.attended,
    level: tournament.level,
    entryType: tournament.entryType,
    lifecycleStatus: tournament.lifecycleStatus,
    distanceFromColumbus: tournament.distanceFromColumbus,
    additionalNotes: tournament.additionalNotes,
    recruitsAttendingText: tournament.recruitsAttendingText,
    estimatedDriveTime: tournament.estimatedDriveTime,
    travelMethod: tournament.travelMethod,
    departureDate: tournament.departureDate,
    returnDate: tournament.returnDate,
    hotelName: tournament.hotelName,
    hotelAddress: tournament.hotelAddress,
    hotelConfirmation: tournament.hotelConfirmation,
    hotelCheckIn: tournament.hotelCheckIn,
    hotelCheckOut: tournament.hotelCheckOut,
    airport: tournament.airport,
    flightInfo: tournament.flightInfo,
    rentalCar: tournament.rentalCar,
    drawsUrl: tournament.drawsUrl,
    ustaUrl: tournament.ustaUrl,
    scheduleUrl: tournament.scheduleUrl,
    resultsUrl: tournament.resultsUrl,
  };
}

export function emptyTournamentInput(): TournamentInput {
  return {
    name: "",
    startDate: null,
    endDate: null,
    location: null,
    venue: null,
    surface: null,
    status: "planned",
    recruitingPlan: "watching",
    websiteUrl: null,
    notes: null,
    attended: null,
    level: null,
    entryType: null,
    lifecycleStatus: null,
    distanceFromColumbus: null,
    additionalNotes: null,
    recruitsAttendingText: null,
    ...EMPTY_TOURNAMENT_TRAVEL_FIELDS,
  };
}

export function locationFromCityState(city: string, state: string): string | null {
  return joinCityState(city, state);
}

export function cityStateFromLocation(location: string | null): { city: string; state: string } {
  const parsed = splitCityState(location);
  return { city: parsed.city ?? "", state: parsed.state ?? "" };
}

export function optionsWithCurrent(options: readonly string[], current: string | null | undefined): string[] {
  const value = current?.trim() ?? "";
  return value && !options.includes(value) ? [...options, value] : [...options];
}
