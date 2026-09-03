import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";

import type { RosterPlayer } from "./types";

export function isCurrentRosterPlayer(person: Person): boolean {
  return person.role?.key === ROLE_KEYS.player && person.status?.key === STATUS_KEYS.current;
}

export function toRosterPlayer(person: Person): RosterPlayer {
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    preferredName: person.preferredName,
    classYear: person.classYear,
  };
}

export function currentRosterPlayers(people: readonly Person[]): RosterPlayer[] {
  return people.filter(isCurrentRosterPlayer).map(toRosterPlayer);
}

export function rosterPlayerFullName(player: RosterPlayer): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

export function rosterPlayerFirstName(player: RosterPlayer): string {
  return player.preferredName?.trim() || player.firstName;
}

function firstNameKey(player: RosterPlayer): string {
  return normalizePersonToken(rosterPlayerFirstName(player));
}

export function rosterPlayerShortName(player: RosterPlayer, roster: readonly RosterPlayer[]): string {
  const key = firstNameKey(player);
  const collisions = roster.filter((other) => firstNameKey(other) === key);
  if (collisions.length > 1) return rosterPlayerFullName(player);
  return rosterPlayerFirstName(player);
}

export function normalizePersonToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ");
}

export function findRosterPlayer(roster: readonly RosterPlayer[], id: string): RosterPlayer | undefined {
  return roster.find((player) => player.id === id);
}
