import type { Person, PersonRole } from "../../src/features/people/types";

function nameKey(person: Person): string {
  return `${person.firstName.trim().toLowerCase()}\0${person.lastName.trim().toLowerCase()}`;
}

function preferDefined<T>(a: T | undefined, b: T | undefined): T | undefined {
  if (a !== undefined && a !== null && a !== "") return a;
  if (b !== undefined && b !== null && b !== "") return b;
  return a ?? b;
}

function uniqueRoles(roles: PersonRole[]): PersonRole[] {
  return Array.from(new Set(roles)).sort();
}

/** Prefer reserved `person-*` ids, then unsuffixed ids over `*-2` collisions. */
function preferId(a: string, b: string): string {
  const aPerson = a.startsWith("person-");
  const bPerson = b.startsWith("person-");
  if (aPerson && !bPerson) return a;
  if (bPerson && !aPerson) return b;

  const suffix = /-\d+$/;
  const aSuffixed = suffix.test(a);
  const bSuffixed = suffix.test(b);
  if (aSuffixed && !bSuffixed) return b;
  if (bSuffixed && !aSuffixed) return a;
  return a.length <= b.length ? a : b;
}

function countPopulated(person: Person): number {
  return Object.values(person).filter((value) => {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;
}

/** Prefer a plausible adult DOB when one Airtable row has a bad/placeholder date. */
function preferDateOfBirth(a?: string, b?: string): string | undefined {
  const score = (iso?: string): number => {
    if (!iso) return -1;
    const year = Number(iso.slice(0, 4));
    if (!Number.isFinite(year)) return -1;
    const age = new Date().getUTCFullYear() - year;
    if (age >= 16 && age <= 90) return 2;
    return 0;
  };
  const sa = score(a);
  const sb = score(b);
  if (sa === sb) return preferDefined(a, b);
  return sa > sb ? a : b;
}

/**
 * Merges two Person rows for the same individual (e.g. Andy Mackler as
 * Archive alumni + Class=Coach). Unions roles and prefers populated fields.
 */
export function mergePersonRecords(a: Person, b: Person): Person {
  const roles = uniqueRoles([...a.roles, ...b.roles]);
  const status =
    a.status === "alumni" || b.status === "alumni" || roles.includes("alumni")
      ? "alumni"
      : "current";

  // Prefer the richer record as the base for scalar fields.
  const [primary, secondary] =
    countPopulated(a) >= countPopulated(b) ? [a, b] : [b, a];

  let playerStatus = preferDefined(primary.playerStatus, secondary.playerStatus);
  if (status === "alumni") {
    playerStatus = playerStatus ?? "graduated";
  } else if (roles.includes("coach") && !roles.includes("player")) {
    playerStatus = undefined;
  }

  // Prefer a specific coaching title over a generic "Coach".
  const title = (() => {
    const candidates = [a.title, b.title].filter((t): t is string => Boolean(t?.trim()));
    const specific = candidates.find((t) => t.trim().toLowerCase() !== "coach");
    return specific ?? candidates[0];
  })();

  return {
    id: preferId(a.id, b.id),
    createdAt: a.createdAt <= b.createdAt ? a.createdAt : b.createdAt,
    updatedAt: a.updatedAt >= b.updatedAt ? a.updatedAt : b.updatedAt,

    status,
    roles,
    title,

    firstName: primary.firstName,
    middleName: preferDefined(primary.middleName, secondary.middleName),
    lastName: primary.lastName,
    preferredName: preferDefined(primary.preferredName, secondary.preferredName),
    dateOfBirth: preferDateOfBirth(a.dateOfBirth, b.dateOfBirth),
    photoUrl: preferDefined(primary.photoUrl, secondary.photoUrl),

    cellPhone: preferDefined(primary.cellPhone, secondary.cellPhone),
    personalEmail: preferDefined(primary.personalEmail, secondary.personalEmail),
    denisonEmail: preferDefined(primary.denisonEmail, secondary.denisonEmail),
    preferredContactMethod: preferDefined(
      primary.preferredContactMethod,
      secondary.preferredContactMethod,
    ),

    addressLine1: preferDefined(primary.addressLine1, secondary.addressLine1),
    addressLine2: preferDefined(primary.addressLine2, secondary.addressLine2),
    city: preferDefined(primary.city, secondary.city),
    state: preferDefined(primary.state, secondary.state),
    zipCode: preferDefined(primary.zipCode, secondary.zipCode),
    country: preferDefined(primary.country, secondary.country),

    classYear: preferDefined(primary.classYear, secondary.classYear),
    major: preferDefined(primary.major, secondary.major),
    minor: preferDefined(primary.minor, secondary.minor),
    denisonId: preferDefined(primary.denisonId, secondary.denisonId),
    dorm: preferDefined(primary.dorm, secondary.dorm),
    roomNumber: preferDefined(primary.roomNumber, secondary.roomNumber),

    utr: preferDefined(primary.utr, secondary.utr),
    wtn: preferDefined(primary.wtn, secondary.wtn),
    dominantHand: preferDefined(primary.dominantHand, secondary.dominantHand),
    heightInches: preferDefined(primary.heightInches, secondary.heightInches),
    weightLbs: preferDefined(primary.weightLbs, secondary.weightLbs),
    playerStatus,

    relationships:
      primary.relationships.length > 0 ? primary.relationships : secondary.relationships,

    notes: preferDefined(primary.notes, secondary.notes),
  };
}

/**
 * Collapses multiple Airtable rows for the same person (same first + last
 * name) into one Person with unioned roles. Idempotent for already-unique lists.
 */
export function mergePeopleByName(people: Person[]): { people: Person[]; mergeCount: number } {
  const byName = new Map<string, Person>();
  let mergeCount = 0;

  for (const person of people) {
    const key = nameKey(person);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, person);
      continue;
    }
    byName.set(key, mergePersonRecords(existing, person));
    mergeCount += 1;
  }

  return { people: Array.from(byName.values()), mergeCount };
}
