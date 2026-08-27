import type { RoleBadgeTone } from "@/components/RoleBadge";
import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import { EMPTY_VALUE, formatGpa } from "@/lib/formatting";

import type { ContactMethod, Person, PlayerStatus } from "./types";

export function getDisplayFirstName(person: Person): string {
  return person.preferredName?.trim() || person.firstName;
}

export function getDisplayName(person: Person): string {
  return `${getDisplayFirstName(person)} ${person.lastName}`;
}

/**
 * Left-nav descriptor for the Academics workspace.
 * Major · GPA when both exist; either value alone; otherwise "No academic record".
 */
export function formatAcademicsNavDescriptor(person: Person): string {
  const major = person.major?.trim() ?? "";
  const gpaDisplay = formatGpa(person.gpa);
  const hasGpa = gpaDisplay !== EMPTY_VALUE;

  if (major && hasGpa) return `${major} · ${gpaDisplay} GPA`;
  if (major) return major;
  if (hasGpa) return `${gpaDisplay} GPA`;
  return "No academic record";
}

const EQUIPMENT_ATTRIBUTE_KEYS = [
  "tShirtSize",
  "driFitSize",
  "collaredShirtSize",
  "longSleeveSize",
  "jacketSize",
  "hoodieSize",
  "shortsSize",
  "pantsSize",
  "shoeSize",
  "racket",
  "gripSize",
  "string",
] as const satisfies readonly (keyof Person)[];

function isPopulatedEquipmentValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

/**
 * Left-nav descriptor for the Equipment workspace.
 * Racket when present; otherwise "Equipment on file" / "No equipment on file".
 */
export function formatEquipmentNavDescriptor(person: Person): string {
  const racket = person.racket?.trim() ?? "";
  if (racket) return racket;

  const hasAny = EQUIPMENT_ATTRIBUTE_KEYS.some((key) =>
    isPopulatedEquipmentValue(person[key]),
  );
  return hasAny ? "Equipment on file" : "No equipment on file";
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

/**
 * Display format for Denison ID (D#). Stored values are typically `D02008078`;
 * UI always shows `D#02008078`, or `D# —` when unset.
 */
export function formatDenisonIdDisplay(denisonId: string | undefined): string {
  const trimmed = denisonId?.trim();
  if (!trimmed) return "D# —";
  const digits = trimmed.replace(/^D#?/i, "");
  return digits ? `D#${digits}` : "D# —";
}

export function getHometown(person: Person): string | undefined {
  if (person.city && person.state) return `${person.city}, ${person.state}`;
  return person.city ?? person.state;
}

/** Parse a "City, ST" hometown string into Person city / state fields. */
export function parseHometown(raw: string): { city?: string; state?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { city: undefined, state: undefined };
  const comma = trimmed.lastIndexOf(",");
  if (comma === -1) {
    return { city: trimmed, state: undefined };
  }
  const city = trimmed.slice(0, comma).trim();
  const state = trimmed.slice(comma + 1).trim();
  return {
    city: city || undefined,
    state: state || undefined,
  };
}

export function getPermanentAddress(person: Person): string | undefined {
  const cityState = [person.city, person.state].filter(Boolean).join(", ");
  const zipCountry = [person.zipCode, person.country].filter(Boolean).join(" ");

  const parts = [person.addressLine1, person.addressLine2, cityState, zipCountry].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  return parts.length > 0 ? parts.join(", ") : undefined;
}

/** Display label from the joined status lookup (BP-025A). */
export function getStatusLabel(person: Person): string {
  return person.status.label;
}

export function getStatusTone(person: Person): "denison" | "neutral" {
  return person.status.key === STATUS_KEYS.current ? "denison" : "neutral";
}

/**
 * Maps a person's status to a card accent-bar tone. Kept separate from
 * `getStatusTone` (badge coloring) so future card types can extend the
 * mapping without touching the badge.
 */
export function getStatusAccentTone(person: Person): "denison" | "neutral" {
  return person.status.key === STATUS_KEYS.current ? "denison" : "neutral";
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
      return EMPTY_VALUE;
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

/** True when the person's role lookup key matches (BP-025A — single role). */
export function hasRole(person: Person, roleKey: string): boolean {
  return person.role.key === roleKey;
}

/**
 * Command-K / favorites object type for a Person.
 * Recruits are a distinct type so search can route to Recruiting workspace.
 */
export function searchObjectTypeForPerson(
  person: Person,
): "recruits" | "coaches" | "staff" | "people" {
  if (hasRole(person, ROLE_KEYS.recruit)) return "recruits";
  if (hasRole(person, ROLE_KEYS.coach)) return "coaches";
  if (hasRole(person, ROLE_KEYS.staff)) return "staff";
  return "people";
}

/** True when the person holds the coach role. */
export function isCoach(person: Person): boolean {
  return hasRole(person, ROLE_KEYS.coach);
}

/**
 * Team module membership (BP-039A).
 *
 * Team is not an all-People directory — only Players and Coaches belong.
 * Parents (`family`), Recruits, Alumni, and Staff are excluded unless they
 * also hold a player or coach role (single `role_id` today).
 */
export function isTeamDirectoryPerson(person: Person): boolean {
  return hasRole(person, ROLE_KEYS.player) || hasRole(person, ROLE_KEYS.coach);
}

/**
 * Canonical current Denison team membership: Team directory role
 * (Player or Coach) plus Current status. Uses lookup keys, never labels.
 * Missing role/status is not treated as team membership.
 */
export function isCurrentDenisonTeamMember(person: Person): boolean {
  const roleKey = person.role?.key;
  const statusKey = person.status?.key;
  if (!roleKey || !statusKey) return false;
  return statusKey === STATUS_KEYS.current && isTeamDirectoryPerson(person);
}

export function isCurrentDenisonTeamMemberFromKeys(
  roleKey: string | null | undefined,
  statusKey: string | null | undefined,
): boolean {
  if (!roleKey || !statusKey) return false;
  return (
    statusKey === STATUS_KEYS.current &&
    (roleKey === ROLE_KEYS.player || roleKey === ROLE_KEYS.coach)
  );
}

/**
 * Coach-oriented directory presentation: role is Coach (or Staff).
 * Status is never inferred from role.
 */
export function isCoachDirectoryPerson(person: Person): boolean {
  return hasRole(person, ROLE_KEYS.coach) || hasRole(person, ROLE_KEYS.staff);
}

/** Family / parent Person — no player dashboard chrome (BP-040E). */
export function isFamilyPerson(person: Person): boolean {
  return hasRole(person, ROLE_KEYS.family);
}

export type PersonRoleBadgeInfo = {
  label: string;
  /** Always neutral — identity metadata, never a notification tone. */
  tone: RoleBadgeTone;
};

/**
 * Team directory role text (BP-025B): job title when present, otherwise the
 * role lookup label (including "Player"). Plain presentation — no badges.
 */
export function getPersonRoleDisplay(person: Person): string {
  const titled = person.title?.trim();
  if (titled) return titled;
  return person.role.label;
}

/**
 * Quiet identity metadata for workspace chrome (BP-022D / BP-025A).
 * Prefers title, then non-player role labels. Status is never included.
 */
export function getPersonRoleBadges(person: Person): PersonRoleBadgeInfo[] {
  const badges: PersonRoleBadgeInfo[] = [];
  const titled = person.title?.trim();
  const seen = new Set<string>();

  function push(label: string) {
    const key = label.toLowerCase();
    if (!label || key === "player" || seen.has(key)) return;
    seen.add(key);
    badges.push({ label, tone: "neutral" });
  }

  if (titled) {
    push(titled);
  } else if (person.role.key !== ROLE_KEYS.player) {
    push(person.role.label);
  }

  return badges.slice(0, 3);
}

/**
 * Primary role / title label (single string). Prefer `getPersonRoleDisplay`
 * for Team directory Role column text.
 */
export function getPersonRoleLabel(person: Person): string {
  return getPersonRoleDisplay(person);
}

export { matchesSearch } from "./personSearch";

export function getPersonById(people: Person[], id: string): Person | undefined {
  return people.find((person) => person.id === id);
}
