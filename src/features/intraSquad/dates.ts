const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar date as YYYY-MM-DD. Does not use UTC. */
export function todayLocalIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type QuickMatchDateState = {
  playedAt: string;
  dateTouched: boolean;
};

/** Single source of truth for the date label and `<input type="date">` value. */
export function resolveQuickMatchDate(
  state: QuickMatchDateState,
  now: Date = new Date(),
): string {
  return state.dateTouched ? state.playedAt : todayLocalIsoDate(now);
}

export function freshQuickMatchDateState(now: Date = new Date()): QuickMatchDateState {
  return { playedAt: todayLocalIsoDate(now), dateTouched: false };
}

/** Existing matches keep their stored date; new forms use local today. */
export function playedAtForMatchForm(
  match: { playedAt: string } | null | undefined,
  now: Date = new Date(),
): string {
  if (match?.playedAt && isIsoCalendarDate(match.playedAt)) return match.playedAt;
  return todayLocalIsoDate(now);
}

export function isIsoCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value.trim())) return false;
  const [year, month, day] = value.trim().split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isTodayLocalDate(value: string, now: Date = new Date()): boolean {
  return value === todayLocalIsoDate(now);
}

export function parseIsoCalendarDate(value: string): Date | null {
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}
