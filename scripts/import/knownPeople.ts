/**
 * Known people with reserved stable Person ids (BP-021 development seed).
 *
 * People sync import must reuse these ids so later syncs update the same rows
 * instead of creating `player-*` duplicates. Titles here are the verified
 * coaching titles for development when the sync CSV lacks a Title value.
 */
export type KnownPersonSpec = {
  id: string;
  /** Preferred display title when sync Class is a generic "Coach". */
  title: string;
};

function nameKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}

const KNOWN_PEOPLE: Record<string, KnownPersonSpec> = {
  [nameKey("David", "Schilling")]: {
    id: "person-david-schilling",
    title: "Head Coach",
  },
  [nameKey("Andy", "Mackler")]: {
    id: "person-andy-mackler",
    title: "Assistant Coach",
  },
};

export function lookupKnownPerson(
  firstName: string,
  lastName: string,
): KnownPersonSpec | undefined {
  return KNOWN_PEOPLE[nameKey(firstName, lastName)];
}

export const DAVID_SCHILLING_ID = "person-david-schilling";
export const ANDY_MACKLER_ID = "person-andy-mackler";
