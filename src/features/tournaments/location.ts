import type { Tournament } from "./types";

export function splitCityState(location: string | null | undefined): {
  city: string | null;
  state: string | null;
} {
  const trimmed = location?.trim() ?? "";
  if (!trimmed) return { city: null, state: null };
  const comma = trimmed.lastIndexOf(",");
  if (comma === -1) return { city: trimmed, state: null };
  const city = trimmed.slice(0, comma).trim() || null;
  const state = trimmed.slice(comma + 1).trim() || null;
  return { city, state };
}

export function joinCityState(city: string | null | undefined, state: string | null | undefined): string | null {
  const cityValue = city?.trim() ?? "";
  const stateValue = state?.trim() ?? "";
  if (cityValue && stateValue) return `${cityValue}, ${stateValue}`;
  return cityValue || stateValue || null;
}

export function splitDistance(raw: string | null | undefined): { miles: string; extra: string } {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return { miles: "", extra: "" };
  const miles = parseDistanceMiles(trimmed);
  if (miles == null) return { miles: "", extra: trimmed };
  const remainder = trimmed.replace(/,/g, "").replace(String(miles), "").trim();
  return { miles: String(miles), extra: remainder };
}

export function joinDistance(miles: string | null | undefined, extra: string | null | undefined): string | null {
  const milesValue = miles?.trim() ?? "";
  const extraValue = extra?.trim() ?? "";
  if (milesValue && extraValue) return `${milesValue} ${extraValue}`;
  return milesValue || extraValue || null;
}

/** Leading numeric miles from CSV values that may also include travel time. */
export function parseDistanceMiles(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function isPastTournament(tournament: Tournament, today = new Date().toISOString().slice(0, 10)): boolean {
  if (tournament.lifecycleStatus === "past") return true;
  if (tournament.lifecycleStatus === "upcoming") return false;
  const end = tournament.endDate ?? tournament.startDate;
  return Boolean(end && end < today);
}

/**
 * Default list order: upcoming (and undated) by start date ascending,
 * then past events with the most recent first.
 */
export function compareDefaultTournamentOrder(a: Tournament, b: Tournament): number {
  const aPast = isPastTournament(a);
  const bPast = isPastTournament(b);
  if (aPast !== bPast) return aPast ? 1 : -1;

  const aStart = a.startDate ?? "";
  const bStart = b.startDate ?? "";
  if (!aStart && !bStart) return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  if (!aStart) return 1;
  if (!bStart) return -1;
  if (aPast) {
    const aEnd = a.endDate ?? a.startDate ?? "";
    const bEnd = b.endDate ?? b.startDate ?? "";
    if (!aEnd && !bEnd) return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (!aEnd) return 1;
    if (!bEnd) return -1;
    return bEnd.localeCompare(aEnd) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }
  return aStart.localeCompare(bStart) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function defaultSortedTournaments(tournaments: readonly Tournament[]): Tournament[] {
  return [...tournaments].sort(compareDefaultTournamentOrder);
}

/** Display-only split of an already-filtered list. Does not write status. */
export function partitionTournamentsBySchedule(
  tournaments: readonly Tournament[],
  today = new Date().toISOString().slice(0, 10),
): { upcoming: Tournament[]; past: Tournament[] } {
  const upcoming: Tournament[] = [];
  const past: Tournament[] = [];
  for (const tournament of tournaments) {
    if (isPastTournament(tournament, today)) past.push(tournament);
    else upcoming.push(tournament);
  }
  return {
    upcoming: defaultSortedTournaments(upcoming),
    past: defaultSortedTournaments(past),
  };
}
