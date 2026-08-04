import type { ContactMethod, Person, PersonStatus, PlayerStatus } from "./types";

export function getDisplayFirstName(person: Person): string {
  return person.preferredName?.trim() || person.firstName;
}

export function getDisplayName(person: Person): string {
  return `${getDisplayFirstName(person)} ${person.lastName}`;
}

/** Full legal name, with a preferred name (if different) shown in quotes. */
export function getFullDisplayName(person: Person): string {
  if (person.preferredName && person.preferredName !== person.firstName) {
    return `${person.firstName} "${person.preferredName}" ${person.lastName}`;
  }
  return `${person.firstName} ${person.lastName}`;
}

export function getInitials(person: Person): string {
  const first = getDisplayFirstName(person).charAt(0);
  const last = person.lastName.charAt(0);
  return `${first}${last}`.toUpperCase();
}

export function getHometown(person: Person): string | undefined {
  if (person.city && person.state) return `${person.city}, ${person.state}`;
  return person.city ?? person.state;
}

export function getPermanentAddress(person: Person): string | undefined {
  const cityState = [person.city, person.state].filter(Boolean).join(", ");
  const zipCountry = [person.zipCode, person.country].filter(Boolean).join(" ");

  const parts = [person.addressLine1, person.addressLine2, cityState, zipCountry].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function getStatusLabel(status: PersonStatus): string {
  return status === "current" ? "Current" : "Alumni";
}

export function getStatusTone(status: PersonStatus): "denison" | "neutral" {
  return status === "current" ? "denison" : "neutral";
}

/**
 * Maps a person's status to a card accent-bar tone. Kept separate from
 * `getStatusTone` (badge coloring) so future card types can extend the
 * mapping — e.g. a Recruit or Coach status — without touching the badge.
 */
export function getStatusAccentTone(status: PersonStatus): "denison" | "neutral" {
  return status === "current" ? "denison" : "neutral";
}

export function getPlayerStatusLabel(playerStatus?: PlayerStatus): string {
  switch (playerStatus) {
    case "active":
      return "Active";
    case "injured":
      return "Injured";
    case "inactive":
      return "Inactive";
    case "graduated":
      return "Graduated";
    default:
      return "—";
  }
}

export function getPlayerStatusTone(
  playerStatus?: PlayerStatus,
): "success" | "warning" | "neutral" {
  switch (playerStatus) {
    case "active":
      return "success";
    case "injured":
      return "warning";
    default:
      return "neutral";
  }
}

export function formatHeight(heightInches?: number): string | undefined {
  if (!heightInches) return undefined;
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;
  return `${feet}'${inches}"`;
}

export function formatWeight(weightLbs?: number): string | undefined {
  if (!weightLbs) return undefined;
  return `${weightLbs} lbs`;
}

export function getPreferredContactLabel(method?: ContactMethod): string | undefined {
  switch (method) {
    case "phone":
      return "Phone";
    case "text":
      return "Text";
    case "email":
      return "Email";
    default:
      return undefined;
  }
}

export function matchesSearch(person: Person, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [person.firstName, person.lastName, person.preferredName, person.city, person.major]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export type StatusFilter = "all" | PersonStatus;

export function filterPeople(
  people: Person[],
  { status, query }: { status: StatusFilter; query: string },
): Person[] {
  return people
    .filter((person) => status === "all" || person.status === status)
    .filter((person) => matchesSearch(person, query))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

export function getPersonById(people: Person[], id: string): Person | undefined {
  return people.find((person) => person.id === id);
}
