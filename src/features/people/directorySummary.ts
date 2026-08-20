/**
 * Players / Coaches directory summary counts.
 * Presentation only — derived from existing Person role/membership, not new metrics.
 */

import { ROLE_KEYS } from "@/features/lookups/seed";

import type { Person } from "./types";
import { hasRole, isTeamDirectoryPerson } from "./utils";

export type PeopleDirectoryKpis = {
  /** Players + coaches in the directory (program membership). */
  total: number;
  players: number;
  coaches: number;
};

export function computePeopleDirectoryKpis(
  people: readonly Person[],
): PeopleDirectoryKpis {
  const members = people.filter(isTeamDirectoryPerson);
  let players = 0;
  let coaches = 0;
  for (const person of members) {
    if (hasRole(person, ROLE_KEYS.player)) players += 1;
    if (hasRole(person, ROLE_KEYS.coach)) coaches += 1;
  }
  return {
    total: members.length,
    players,
    coaches,
  };
}
