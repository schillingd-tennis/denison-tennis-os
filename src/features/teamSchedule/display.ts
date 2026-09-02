import type { TeamScheduleEvent } from "./types";
import { displayOpponentOrEvent } from "./types";
import { isSharedDateGroup } from "./sorting";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function parseDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthLabel(iso: string): string {
  const date = parseDate(iso);
  return MONTHS[date.getMonth()] ?? "";
}

function dayLabel(iso: string): string {
  return String(parseDate(iso).getDate());
}

function weekdayLabel(iso: string): string {
  const date = parseDate(iso);
  return WEEKDAYS[date.getDay()] ?? "";
}

export type ScheduleDateDisplay = {
  month: string;
  day: string;
  weekday: string;
  multiDay: boolean;
};

export function formatScheduleDateDisplay(startDate: string, endDate: string): ScheduleDateDisplay {
  const multiDay = startDate !== endDate;
  if (!multiDay) {
    return {
      month: monthLabel(startDate),
      day: dayLabel(startDate),
      weekday: weekdayLabel(startDate),
      multiDay: false,
    };
  }
  const startMonth = monthLabel(startDate);
  const endMonth = monthLabel(endDate);
  const day =
    startMonth === endMonth
      ? `${dayLabel(startDate)}–${dayLabel(endDate)}`
      : `${dayLabel(startDate)}–${endMonth} ${dayLabel(endDate)}`;
  return {
    month: startMonth,
    day,
    weekday: `${weekdayLabel(startDate)}–${weekdayLabel(endDate)}`,
    multiDay: true,
  };
}

export function formatCompDateNumber(event: TeamScheduleEvent): string | null {
  if (!event.countsAsCompetitionDate || event.competitionDateNumber == null) return null;
  return `#${event.competitionDateNumber}`;
}

export function formatItaRank(rank: number | null): string {
  if (rank == null) return "—";
  return `#${rank}`;
}

export type TypeBadge = { label: string; className: string };

export function typeBadgeForEvent(event: TeamScheduleEvent): TypeBadge {
  if (event.eventType === "non_team_event") {
    return { label: "Non-Team", className: "bg-zinc-100 text-zinc-700" };
  }
  if (event.eventType === "tournament") {
    return { label: "Tournament", className: "bg-purple-50 text-purple-700" };
  }
  if (event.eventName?.toLowerCase().includes("spring break")) {
    return { label: "Spring Break", className: "bg-sky-50 text-sky-700" };
  }
  if (event.ncac) {
    return { label: "NCAC", className: "bg-blue-50 text-blue-700" };
  }
  return { label: "Non-Conf", className: "bg-slate-100 text-slate-700" };
}

export function statusBadgeClass(status: TeamScheduleEvent["status"]): string {
  switch (status) {
    case "confirmed":
      return "bg-green-50 text-green-700";
    case "tentative":
      return "bg-amber-50 text-amber-800";
    case "tbd":
      return "bg-slate-100 text-slate-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function sharedDateOrDhLabel(
  event: TeamScheduleEvent,
  allEvents: readonly TeamScheduleEvent[],
): string | null {
  const group = event.competitionDateGroup;
  const shared = isSharedDateGroup(allEvents, group);
  if (shared && group && event.competitionDateNumber != null) {
    const groupEvents = allEvents.filter((e) => e.competitionDateGroup === group);
    const allTeamMatches = groupEvents.every((e) => e.eventType === "team_match" || e.eventType === "team_match_placeholder");
    if (allTeamMatches && event.doubleheaderStatus === "confirmed") {
      return "Confirmed DH";
    }
    if (allTeamMatches && event.doubleheaderStatus === "potential") {
      return "Potential DH";
    }
    return `Shared Date #${event.competitionDateNumber}`;
  }
  if (event.doubleheaderStatus === "confirmed") return "Confirmed DH";
  if (event.doubleheaderStatus === "potential") return "Potential DH";
  return null;
}

export function truncateNotes(notes: string | null, maxLength = 48): string {
  if (!notes) return "—";
  if (notes.length <= maxLength) return notes;
  return `${notes.slice(0, maxLength - 1)}…`;
}

export function locationLine(event: TeamScheduleEvent): string {
  if (event.locationText?.trim()) return event.locationText;
  const parts = [event.city, event.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function scheduleEventToCsvRow(event: TeamScheduleEvent): string[] {
  return [
    event.competitionDateNumber != null ? String(event.competitionDateNumber) : "",
    event.startDate,
    event.endDate,
    displayOpponentOrEvent(event),
    event.itaRank != null ? String(event.itaRank) : "",
    event.siteDesignation,
    locationLine(event),
    event.timeText ?? "",
    event.eventType,
    event.status,
    event.doubleheaderStatus,
    event.officialsNeeded != null ? String(event.officialsNeeded) : "",
    event.notes ?? "",
  ];
}

export function scheduleEventsToCsv(events: readonly TeamScheduleEvent[]): string {
  const header = [
    "Comp Date #",
    "Start Date",
    "End Date",
    "Opponent/Event",
    "ITA Rank",
    "Site",
    "Location",
    "Time",
    "Type",
    "Status",
    "DH Status",
    "Officials",
    "Notes",
  ];
  const rows = events.map((event) =>
    scheduleEventToCsvRow(event).map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
