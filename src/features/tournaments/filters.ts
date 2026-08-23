import {
  applyFilters,
  isAllActive,
  resolveFilterSelection,
  type FilterDefinition,
} from "@/lib/filtering";

import { isUpcomingWithinDays } from "./metrics";
import type { Tournament } from "./types";

export const TOURNAMENT_FILTER_CLEAR_ID = "all";

export function tournamentSearchHaystack(tournament: Tournament): string {
  const recruits = tournament.linkedRecruits
    .map((recruit) => recruit.displayName)
    .join(" ");
  return [
    tournament.name,
    tournament.location,
    tournament.venue,
    tournament.surface,
    tournament.notes,
    tournament.websiteUrl,
    tournament.level,
    tournament.entryType,
    tournament.lifecycleStatus,
    tournament.distanceFromColumbus,
    tournament.additionalNotes,
    tournament.recruitsAttendingText,
    recruits,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesTournamentSearch(tournament: Tournament, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return tournamentSearchHaystack(tournament).includes(needle);
}

function isPast(tournament: Tournament): boolean {
  const end = tournament.endDate ?? tournament.startDate;
  if (!end) return false;
  const today = new Date().toISOString().slice(0, 10);
  return end < today;
}

export function uniqueLevels(tournaments: readonly Tournament[]): string[] {
  const values = new Set<string>();
  for (const tournament of tournaments) {
    const level = tournament.level?.trim();
    if (level) values.add(level);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function buildTournamentFilterDefinitions(
  tournaments: readonly Tournament[],
): FilterDefinition<Tournament>[] {
  const statuses: FilterDefinition<Tournament>[] = [
    {
      id: "status:upcoming",
      label: "Upcoming",
      category: "status",
      predicate: (tournament) =>
        tournament.lifecycleStatus === "upcoming" ||
        (!isPast(tournament) && Boolean(tournament.startDate) && tournament.lifecycleStatus !== "past"),
    },
    {
      id: "status:past",
      label: "Past",
      category: "status",
      predicate: (tournament) => tournament.lifecycleStatus === "past" || isPast(tournament),
    },
  ];

  const dates: FilterDefinition<Tournament>[] = [
    {
      id: "date:upcoming",
      label: "Upcoming",
      category: "date",
      predicate: (tournament) =>
        tournament.lifecycleStatus === "upcoming" ||
        (!isPast(tournament) && Boolean(tournament.startDate) && tournament.lifecycleStatus !== "past"),
    },
    {
      id: "date:next90",
      label: "Next 90 days",
      category: "date",
      predicate: (tournament) => isUpcomingWithinDays(tournament),
    },
    {
      id: "date:past",
      label: "Past",
      category: "date",
      predicate: (tournament) => tournament.lifecycleStatus === "past" || isPast(tournament),
    },
  ];

  const levels: FilterDefinition<Tournament>[] = uniqueLevels(tournaments).map((level) => ({
    id: `level:${level}`,
    label: level,
    category: "level",
    predicate: (tournament) => tournament.level?.trim() === level,
  }));

  return [...statuses, ...dates, ...levels];
}

export const TOURNAMENT_FILTER_GROUPS = [
  { category: "status", label: "Status" },
  { category: "date", label: "Date" },
  { category: "level", label: "Level" },
] as const;

export function tournamentFilterIdsForCategory(
  definitions: readonly FilterDefinition<Tournament>[],
  category: string,
): string[] {
  return definitions.filter((definition) => definition.category === category).map((definition) => definition.id);
}

export function sanitizeTournamentFilterIds(
  activeIds: readonly string[],
  definitions: readonly FilterDefinition<Tournament>[],
): string[] {
  const allowed = new Set(definitions.map((definition) => definition.id));
  return activeIds.filter(
    (id) =>
      id !== TOURNAMENT_FILTER_CLEAR_ID &&
      allowed.has(id) &&
      !id.startsWith("surface:") &&
      !id.startsWith("plan:"),
  );
}

export function filterTournaments(
  tournaments: readonly Tournament[],
  query: string,
  activeIds: readonly string[],
  definitions: readonly FilterDefinition<Tournament>[],
): Tournament[] {
  const searched = tournaments.filter((tournament) => matchesTournamentSearch(tournament, query));
  const sanitizedIds = sanitizeTournamentFilterIds(activeIds, definitions);
  if (isAllActive(sanitizedIds)) return searched;
  return applyFilters(searched, definitions, sanitizedIds);
}

export { resolveFilterSelection };
