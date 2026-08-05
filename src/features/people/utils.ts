import type { RoleBadgeTone } from "@/components/RoleBadge";

import type { ContactMethod, Person, PersonRole, PersonStatus, PlayerStatus } from "./types";

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

export function hasRole(person: Person, role: PersonRole): boolean {
  return person.roles.includes(role);
}

/** True when the person holds the coach role (may also be alumni/player). */
export function isCoach(person: Person): boolean {
  return hasRole(person, "coach");
}

/**
 * Coach-oriented directory presentation: has coach role and is not a
 * current player. Alumni coaches (e.g. Andy Mackler) still use this path
 * so list/cards emphasize title + contact over player ratings.
 */
export function isCoachDirectoryPerson(person: Person): boolean {
  return hasRole(person, "coach") && !(hasRole(person, "player") && person.status === "current");
}

export type PersonRoleBadgeInfo = {
  label: string;
  /** Always neutral — identity metadata, never a notification tone. */
  tone: RoleBadgeTone;
};

/** Roles that add identity information. `player` is silent (BP-022D). */
const MEANINGFUL_ROLES: PersonRole[] = ["recruit", "coach", "staff", "alumni"];

function canonicalRoleLabel(role: PersonRole): string | null {
  switch (role) {
    case "player":
      return null;
    case "coach":
      return "Coach";
    case "alumni":
      return "Alumni";
    case "staff":
      return "Staff";
    case "recruit":
      return "Recruit";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

/**
 * Quiet identity metadata for directory + workspace (BP-022D).
 *
 * Prefers `title` (Head Coach / Assistant Coach / Athletic Trainer), then
 * meaningful roles (Coach, Recruit, Alumni, Staff). Never surfaces "Player"
 * — the default roster identity is silent. Empty when nothing to add.
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
  }

  for (const role of MEANINGFUL_ROLES) {
    if (!hasRole(person, role)) continue;
    // Title already communicates coach identity.
    if (role === "coach" && titled) continue;
    const label = canonicalRoleLabel(role);
    if (label) push(label);
  }

  if (person.status === "alumni") {
    push("Alumni");
  }

  return badges.slice(0, 3);
}

/**
 * Primary role / title label (single string). Empty when identity is silent
 * (e.g. a Player with no additional roles). Prefer `getPersonRoleBadges`
 * when rendering UI.
 */
export function getPersonRoleLabel(person: Person): string {
  return getPersonRoleBadges(person)[0]?.label ?? "";
}

export function matchesSearch(person: Person, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    person.firstName,
    person.lastName,
    person.preferredName,
    person.title,
    person.city,
    person.major,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

/** Team directory role filter (BP-021). Default UI selection is `players`. */
export type RoleFilter = "all" | "players" | "coaches" | "alumni";

/**
 * Default roles when importing/backfilling from program status alone.
 * Coaches and staff are assigned explicitly — never inferred from status.
 */
export function defaultRolesForStatus(status: PersonStatus): PersonRole[] {
  return status === "alumni" ? ["alumni"] : ["player"];
}

export function filterPeople(
  people: Person[],
  { role, query }: { role: RoleFilter; query: string },
): Person[] {
  return people
    .filter((person) => {
      switch (role) {
        case "all":
          return true;
        case "players":
          // Current player records — coach-only staff stay out of this filter.
          return hasRole(person, "player") && person.status === "current";
        case "coaches":
          return hasRole(person, "coach");
        case "alumni":
          return hasRole(person, "alumni") || person.status === "alumni";
        default:
          return true;
      }
    })
    .filter((person) => matchesSearch(person, query))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

export function getPersonById(people: Person[], id: string): Person | undefined {
  return people.find((person) => person.id === id);
}
