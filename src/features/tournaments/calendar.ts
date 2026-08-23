import type { Tournament } from "./types";

export type TournamentDateRange = {
  start: Date;
  end: Date;
};

/** Parse `YYYY-MM-DD` as a local calendar date. Invalid values return null. */
export function parseTournamentDay(value: string | null | undefined): Date | null {
  const trimmed = value?.trim() ?? "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) {
    return null;
  }
  return date;
}

export function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

/** Sunday-first month grid, including leading/trailing days from adjacent months. */
export function monthGridDays(month: Date): Date[] {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days: Date[] = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    days.push(day);
  }
  return days;
}

export function tournamentDateRange(tournament: Tournament): TournamentDateRange | null {
  const start = parseTournamentDay(tournament.startDate) ?? parseTournamentDay(tournament.endDate);
  if (!start) return null;
  const end = parseTournamentDay(tournament.endDate) ?? start;
  if (end < start) return { start, end: start };
  return { start, end };
}

export function tournamentCoversDay(range: TournamentDateRange, day: Date): boolean {
  const key = toDayKey(day);
  return toDayKey(range.start) <= key && key <= toDayKey(range.end);
}

export function partitionTournamentsForCalendar(tournaments: readonly Tournament[]): {
  dated: { tournament: Tournament; range: TournamentDateRange }[];
  undated: Tournament[];
} {
  const dated: { tournament: Tournament; range: TournamentDateRange }[] = [];
  const undated: Tournament[] = [];
  for (const tournament of tournaments) {
    const range = tournamentDateRange(tournament);
    if (range) dated.push({ tournament, range });
    else undated.push(tournament);
  }
  return { dated, undated };
}
