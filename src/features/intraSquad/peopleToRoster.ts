import { currentRosterPlayers, toRosterPlayer } from "./roster";
import type { RosterPlayer } from "./types";
import type { Person } from "@/features/people/types";

export { currentRosterPlayers, toRosterPlayer };
export type { RosterPlayer };

export function rosterSortedByName(roster: readonly RosterPlayer[]): RosterPlayer[] {
  return [...roster].sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName);
    if (last !== 0) return last;
    return a.firstName.localeCompare(b.firstName);
  });
}

export function peopleToRoster(people: readonly Person[]): RosterPlayer[] {
  return rosterSortedByName(currentRosterPlayers(people));
}
