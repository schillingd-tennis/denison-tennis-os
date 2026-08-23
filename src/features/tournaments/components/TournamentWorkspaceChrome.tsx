"use client";

import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  ExternalLink,
  Flag,
  NotebookPen,
  Plane,
  Trophy,
  Users,
} from "lucide-react";

import PersonStatusLabel from "@/features/people/components/PersonStatusLabel";
import { typeClass, typeRole } from "@/components/typography";
import { EMPTY_VALUE } from "@/lib/formatting";

import { formatTournamentDates, planLabel, tournamentLocationLine } from "../display";
import { splitCityState } from "../location";
import type { Tournament } from "../types";
import type { TournamentWorkspaceId } from "../workspaces";

export type TournamentWorkspaceTone = TournamentWorkspaceId;

export type TournamentWorkspaceNavItem = {
  id: TournamentWorkspaceTone;
  title: string;
  icon: LucideIcon;
  descriptor: string;
};

/** Same Big Red primary CTA as + Add Tournament / Add Players. */
const TOURNAMENT_PAGE_BUTTON_CLASS =
  "inline-flex h-11 min-w-max shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-denison-red px-5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(200,16,46,0.28)] transition-opacity hover:opacity-90";

const toneSurface: Record<
  TournamentWorkspaceTone,
  { icon: string; active: string; activeIcon: string }
> = {
  overview: {
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    active: "border-[var(--module-accent)] bg-[var(--module-tint)]",
    activeIcon: "bg-[var(--module-accent)]/15 text-[var(--module-accent)]",
  },
  players: {
    icon: "bg-warning/15 text-warning",
    active: "border-warning bg-warning/[0.10]",
    activeIcon: "bg-warning/20 text-warning",
  },
  travel: {
    icon: "bg-research/10 text-research",
    active: "border-research bg-research/[0.08]",
    activeIcon: "bg-research/15 text-research",
  },
  links: {
    icon: "bg-knowledge/10 text-knowledge",
    active: "border-knowledge bg-knowledge/[0.07]",
    activeIcon: "bg-knowledge/15 text-knowledge",
  },
};

export function TournamentWorkspaceProfile({ tournament }: { tournament: Tournament }) {
  const { city, state } = splitCityState(tournament.location);
  const dateRange = formatTournamentDates(tournament.startDate, tournament.endDate);
  const place = tournamentLocationLine(tournament) ?? [city, state].filter(Boolean).join(", ");
  const playerCount = tournament.linkedRecruits.length;
  const tournamentPageUrl = tournament.websiteUrl?.trim() || null;
  const statusLabel = planLabel(tournament.recruitingPlan);
  const statusTone = tournament.recruitingPlan === "traveling" ? "active" : "alumni";
  const initials = tournament.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <section
      className="rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)] max-md:min-w-0 max-md:overflow-x-hidden max-md:px-4"
      aria-label="Tournament header"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-[var(--module-accent)]/10 text-[var(--module-accent)]">
            {initials ? (
              <span className="text-base font-semibold tracking-tight">{initials}</span>
            ) : (
              <Trophy className="h-6 w-7" strokeWidth={1.75} aria-hidden />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className={`${typeRole.personNameHero} break-words md:break-normal`}>{tournament.name}</h1>
            <p className={typeClass("identityMeta")}>
              {dateRange !== EMPTY_VALUE ? dateRange : "Dates not set"}
              {place ? ` · ${place}` : ""}
            </p>
            <div className="mt-0.5">
              <PersonStatusLabel tone={statusTone} label={statusLabel} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <p className="text-sm font-medium text-text-primary sm:pt-1">
            {playerCount} {playerCount === 1 ? "Player" : "Players"}
          </p>
          {tournamentPageUrl ? (
            <a
              href={tournamentPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={TOURNAMENT_PAGE_BUTTON_CLASS}
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
              Open Tournament Page
            </a>
          ) : (
            <button type="button" disabled className={`${TOURNAMENT_PAGE_BUTTON_CLASS} cursor-not-allowed opacity-40 hover:opacity-40`}>
              <ExternalLink className="h-4 w-4 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
              Open Tournament Page
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function TournamentWorkspaceNav({
  items,
  activeId,
  onSelect,
}: {
  items: TournamentWorkspaceNavItem[];
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
                <span className="block text-sm font-medium tracking-tight text-text-primary">{item.title}</span>
                <span className="mt-px block truncate text-[12px] leading-snug text-text-secondary">
                  {item.descriptor}
                </span>
              </span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 ${active ? "text-[var(--module-accent)]/70" : "text-text-secondary/40"}`}
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function tournamentWorkspaceItems(tournament: Tournament): TournamentWorkspaceNavItem[] {
  const dateRange = formatTournamentDates(tournament.startDate, tournament.endDate);
  const place = tournamentLocationLine(tournament);
  return [
    {
      id: "overview",
      title: "Overview",
      icon: Flag,
      descriptor:
        [tournament.level, tournament.entryType].filter(Boolean).join(" · ") ||
        (dateRange !== EMPTY_VALUE ? dateRange : "Identity, dates, and location"),
    },
    {
      id: "players",
      title: "The Players",
      icon: Users,
      descriptor:
        tournament.linkedRecruits.length > 0
          ? `${tournament.linkedRecruits.length} linked`
          : "Link recruits from Recruiting",
    },
    {
      id: "travel",
      title: "Travel Info",
      icon: Plane,
      descriptor: tournament.hotelName || tournament.travelMethod || place || "Trip logistics",
    },
    {
      id: "links",
      title: "Links / Notes",
      icon: NotebookPen,
      descriptor: tournament.websiteUrl ? "Pages and notes" : "Notes and URLs",
    },
  ];
}
