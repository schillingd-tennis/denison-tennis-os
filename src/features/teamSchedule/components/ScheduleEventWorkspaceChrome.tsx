"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckSquare,
  GraduationCap,
  MapPin,
  NotebookPen,
  Plane,
  Users,
  UsersRound,
} from "lucide-react";

import PersonStatusLabel from "@/features/people/components/PersonStatusLabel";
import { typeClass, typeRole } from "@/components/typography";
import { EMPTY_VALUE, formatDate } from "@/lib/formatting";

import { formatScheduleDateDisplay } from "../display";
import type { ScheduleEventPlanningBundle } from "../eventPlanningTypes";
import { resolveScheduleIdentity } from "../schoolIdentity";
import {
  SCHEDULE_EVENT_TYPE_LABELS,
  SCHEDULE_STATUS_LABELS,
  SITE_DESIGNATION_LABELS,
  displayOpponentOrEvent,
  type TeamScheduleEvent,
} from "../types";
import type { ScheduleEventWorkspaceId } from "../workspaces";
import ScheduleIdentityMark from "./ScheduleIdentityMark";

export type ScheduleEventWorkspaceTone = ScheduleEventWorkspaceId;

export type ScheduleEventWorkspaceNavItem = {
  id: ScheduleEventWorkspaceTone;
  title: string;
  icon: LucideIcon;
  descriptor: string;
};

const toneSurface: Record<
  ScheduleEventWorkspaceTone,
  { icon: string; active: string; activeIcon: string }
> = {
  "event-details": {
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    active: "border-[var(--module-accent)] bg-[var(--module-tint)]",
    activeIcon: "bg-[var(--module-accent)]/15 text-[var(--module-accent)]",
  },
  "traveling-party": {
    icon: "bg-warning/15 text-warning",
    active: "border-warning bg-warning/[0.10]",
    activeIcon: "bg-warning/20 text-warning",
  },
  "teams-involved": {
    icon: "bg-info/10 text-info",
    active: "border-info bg-info/[0.07]",
    activeIcon: "bg-info/15 text-info",
  },
  travel: {
    icon: "bg-research/10 text-research",
    active: "border-research bg-research/[0.08]",
    activeIcon: "bg-research/15 text-research",
  },
  "practice-match-times": {
    icon: "bg-success/10 text-success",
    active: "border-success bg-success/[0.07]",
    activeIcon: "bg-success/15 text-success",
  },
  "alumni-attending": {
    icon: "bg-knowledge/10 text-knowledge",
    active: "border-knowledge bg-knowledge/[0.07]",
    activeIcon: "bg-knowledge/15 text-knowledge",
  },
  "packing-list": {
    icon: "bg-operations/10 text-operations",
    active: "border-operations bg-operations/[0.07]",
    activeIcon: "bg-operations/15 text-operations",
  },
  planning: {
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    active: "border-[var(--module-accent)] bg-[var(--module-tint)]",
    activeIcon: "bg-[var(--module-accent)]/15 text-[var(--module-accent)]",
  },
};

function locationLine(event: TeamScheduleEvent): string {
  if (event.locationText?.trim()) return event.locationText.trim();
  return [event.venueName, event.city, event.state].filter(Boolean).join(", ");
}

function dateRangeLabel(event: TeamScheduleEvent): string {
  if (event.startDate === event.endDate) {
    return formatDate(event.startDate) !== EMPTY_VALUE ? formatDate(event.startDate) : "Date TBD";
  }
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  if (start === EMPTY_VALUE || end === EMPTY_VALUE) return "Dates TBD";
  return `${start} – ${end}`;
}

export function ScheduleEventWorkspaceProfile({
  event,
  officialResultsHref,
  officialResultsLabel,
  resultsStatusLabel,
}: {
  event: TeamScheduleEvent;
  officialResultsHref?: string | null;
  officialResultsLabel?: string | null;
  resultsStatusLabel?: string | null;
}) {
  const identity = resolveScheduleIdentity(event);
  const title = displayOpponentOrEvent(event);
  const place = locationLine(event);
  const dates = dateRangeLabel(event);
  const compact = formatScheduleDateDisplay(event.startDate, event.endDate);
  const statusTone =
    event.status === "confirmed"
      ? "active"
      : event.status === "cancelled"
        ? "inactive"
        : "alumni";

  return (
    <section
      className="rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)] max-md:min-w-0 max-md:overflow-x-hidden max-md:px-4"
      aria-label="Event header"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <ScheduleIdentityMark identity={identity} size={56} />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className={`${typeRole.personNameHero} break-words md:break-normal`}>{title}</h1>
            <p className={typeClass("identityMeta")}>
              {SCHEDULE_EVENT_TYPE_LABELS[event.eventType]}
              {` · ${dates}`}
              {place ? ` · ${place}` : ""}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <PersonStatusLabel tone={statusTone} label={SCHEDULE_STATUS_LABELS[event.status]} />
              <span className="text-sm font-medium text-text-primary">
                {SITE_DESIGNATION_LABELS[event.siteDesignation]}
              </span>
              {event.timeText ? (
                <span className="text-sm text-text-secondary">{event.timeText}</span>
              ) : null}
            </div>
            {officialResultsHref ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link
                  href={officialResultsHref}
                  className="inline-flex h-8 items-center rounded-control bg-[var(--module-accent)] px-3 text-xs font-semibold text-white"
                >
                  {officialResultsLabel ?? "Official Results"}
                </Link>
                {resultsStatusLabel ? (
                  <span className="text-xs text-text-secondary">Results: {resultsStatusLabel}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:pt-1">
          <p className="text-[10px] font-semibold tracking-wide text-text-secondary uppercase">
            {compact.month}
          </p>
          <p className="text-lg font-semibold tabular-nums text-text-primary">{compact.day}</p>
          <p className="text-[11px] font-medium text-text-secondary">{compact.weekday}</p>
        </div>
      </div>
    </section>
  );
}

export function ScheduleEventWorkspaceNav({
  items,
  activeId,
  onSelect,
}: {
  items: ScheduleEventWorkspaceNavItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-border/35" role="listbox" aria-label="Workspaces">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        const tone = toneSurface[item.id];
        return (
          <li key={item.id} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group flex w-full cursor-pointer items-center gap-3 border-l-[3px] px-3 py-2 text-left transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--module-accent)]/35 ${
                active ? tone.active : "border-transparent hover:bg-app-background"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${
                  active ? tone.activeIcon : tone.icon
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium tracking-tight text-text-primary">
                  {item.title}
                </span>
                <span className="mt-px block truncate text-[12px] leading-snug text-text-secondary">
                  {item.descriptor}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function scheduleEventWorkspaceItems(
  event: TeamScheduleEvent,
  planning: ScheduleEventPlanningBundle,
): ScheduleEventWorkspaceNavItem[] {
  const packingDone = planning.packing.filter((item) => item.isChecked).length;
  const packingTotal = planning.packing.length;
  return [
    {
      id: "event-details",
      title: "Event Details",
      icon: MapPin,
      descriptor: locationLine(event) || dateRangeLabel(event) || "Schedule info & venue",
    },
    {
      id: "traveling-party",
      title: "Traveling Party",
      icon: Users,
      descriptor:
        planning.party.length > 0
          ? `${planning.party.length} selected`
          : "Roster players & coaches",
    },
    {
      id: "teams-involved",
      title: "Teams Involved",
      icon: UsersRound,
      descriptor:
        planning.teams.length > 0
          ? `${planning.teams.length} teams`
          : event.teamsInEvent || "Schools in this event",
    },
    {
      id: "travel",
      title: "Travel",
      icon: Plane,
      descriptor:
        planning.travel.length > 0
          ? `${planning.travel.length} arrangement${planning.travel.length === 1 ? "" : "s"}`
          : "Vans, flights, transfers",
    },
    {
      id: "practice-match-times",
      title: "Practice & Match Times",
      icon: CalendarDays,
      descriptor:
        planning.sessions.length > 0
          ? `${planning.sessions.length} session${planning.sessions.length === 1 ? "" : "s"}`
          : "Practices, matches, activities",
    },
    {
      id: "alumni-attending",
      title: "Alumni Attending",
      icon: GraduationCap,
      descriptor:
        planning.alumni.length > 0
          ? `${planning.alumni.length} listed`
          : "Alumni & guests",
    },
    {
      id: "packing-list",
      title: "Packing List",
      icon: CheckSquare,
      descriptor:
        packingTotal > 0 ? `${packingDone}/${packingTotal} checked` : "Checklist for the trip",
    },
    {
      id: "planning",
      title: "Planning",
      icon: NotebookPen,
      descriptor: planning.planning.notes?.trim() ? "Notes saved" : "Working notes",
    },
  ];
}
