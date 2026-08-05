/**
 * Boundary mapping between the `production_people` Supabase table and the
 * internal `Person` domain object (BP-015 / BP-021 / BP-025A).
 */
import { ROLE_SEED, STATUS_SEED, roleSeedByKey, statusSeedByKey } from "@/features/lookups/seed";
import type { LookupRef } from "@/features/lookups/types";

import type { Person, PersonRelationship } from "./types";

type NestedLookup = {
  id: string;
  key: string;
  label: string;
  sort_order?: number;
  active?: boolean;
};

/** Shape of a row as returned by `select` on `production_people` (with joins). */
export type ProductionPersonRow = {
  id: string;
  created_at: string;
  updated_at: string;
  role_id: string;
  status_id: string;
  role?: NestedLookup | NestedLookup[] | null;
  status?: NestedLookup | NestedLookup[] | null;
  title: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  cell_phone: string | null;
  personal_email: string | null;
  denison_email: string | null;
  preferred_contact_method: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  class_year: number | null;
  major: string | null;
  minor: string | null;
  denison_id: string | null;
  dorm: string | null;
  room_number: string | null;
  utr: number | null;
  wtn: number | null;
  dominant_hand: string | null;
  height_inches: number | null;
  weight_lbs: number | null;
  player_status: string | null;
  relationships: PersonRelationship[] | null;
  notes: string | null;
};

function undefinedIfNull<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function asLookup(value: NestedLookup | NestedLookup[] | null | undefined): NestedLookup | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function lookupRefFromNested(
  nested: NestedLookup | null,
  fallbackId: string,
  seed: readonly { id: string; key: string; label: string }[],
): LookupRef {
  if (nested) {
    return { id: nested.id, key: nested.key, label: nested.label };
  }
  const fromSeed = seed.find((entry) => entry.id === fallbackId);
  if (fromSeed) {
    return { id: fromSeed.id, key: fromSeed.key, label: fromSeed.label };
  }
  return { id: fallbackId, key: "unknown", label: "Unknown" };
}

/** Maps a `production_people` row into the `Person` shape. */
export function rowToPerson(row: ProductionPersonRow): Person {
  const role = lookupRefFromNested(asLookup(row.role), row.role_id, ROLE_SEED);
  const status = lookupRefFromNested(asLookup(row.status), row.status_id, STATUS_SEED);

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    roleId: row.role_id,
    statusId: row.status_id,
    role,
    status,
    title: undefinedIfNull(row.title),
    firstName: row.first_name,
    middleName: undefinedIfNull(row.middle_name),
    lastName: row.last_name,
    preferredName: undefinedIfNull(row.preferred_name),
    dateOfBirth: undefinedIfNull(row.date_of_birth),
    photoUrl: undefinedIfNull(row.photo_url),

    cellPhone: undefinedIfNull(row.cell_phone),
    personalEmail: undefinedIfNull(row.personal_email),
    denisonEmail: undefinedIfNull(row.denison_email),
    preferredContactMethod: undefinedIfNull(row.preferred_contact_method) as Person["preferredContactMethod"],

    addressLine1: undefinedIfNull(row.address_line1),
    addressLine2: undefinedIfNull(row.address_line2),
    city: undefinedIfNull(row.city),
    state: undefinedIfNull(row.state),
    zipCode: undefinedIfNull(row.zip_code),
    country: undefinedIfNull(row.country),

    classYear: undefinedIfNull(row.class_year),
    major: undefinedIfNull(row.major),
    minor: undefinedIfNull(row.minor),
    denisonId: undefinedIfNull(row.denison_id),
    dorm: undefinedIfNull(row.dorm),
    roomNumber: undefinedIfNull(row.room_number),

    utr: undefinedIfNull(row.utr),
    wtn: undefinedIfNull(row.wtn),
    dominantHand: undefinedIfNull(row.dominant_hand) as Person["dominantHand"],
    heightInches: undefinedIfNull(row.height_inches),
    weightLbs: undefinedIfNull(row.weight_lbs),
    playerStatus: undefinedIfNull(row.player_status) as Person["playerStatus"],

    relationships: row.relationships ?? [],

    notes: undefinedIfNull(row.notes),
  };
}

const WRITABLE_FIELD_MAP: Partial<Record<keyof Person, string>> = {
  roleId: "role_id",
  statusId: "status_id",
  title: "title",
  firstName: "first_name",
  middleName: "middle_name",
  lastName: "last_name",
  preferredName: "preferred_name",
  dateOfBirth: "date_of_birth",
  photoUrl: "photo_url",

  cellPhone: "cell_phone",
  personalEmail: "personal_email",
  denisonEmail: "denison_email",
  preferredContactMethod: "preferred_contact_method",

  addressLine1: "address_line1",
  addressLine2: "address_line2",
  city: "city",
  state: "state",
  zipCode: "zip_code",
  country: "country",

  classYear: "class_year",
  major: "major",
  minor: "minor",
  denisonId: "denison_id",
  dorm: "dorm",
  roomNumber: "room_number",

  utr: "utr",
  wtn: "wtn",
  dominantHand: "dominant_hand",
  heightInches: "height_inches",
  weightLbs: "weight_lbs",
  playerStatus: "player_status",

  relationships: "relationships",

  notes: "notes",
};

export function personPatchToRow(patch: Partial<Person>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const key of Object.keys(patch) as (keyof Person)[]) {
    const rowKey = WRITABLE_FIELD_MAP[key];
    if (!rowKey) continue;

    const value = patch[key];
    if (key === "relationships") {
      row[rowKey] = value ?? [];
    } else {
      row[rowKey] = value ?? null;
    }
  }

  return row;
}

/** Maps a `Person` into a `production_people` row for inserts/upserts. */
export function personToRow(person: Person): Record<string, unknown> {
  return {
    id: person.id,
    created_at: person.createdAt,
    updated_at: person.updatedAt,

    role_id: person.roleId,
    status_id: person.statusId,
    title: person.title ?? null,
    first_name: person.firstName,
    middle_name: person.middleName ?? null,
    last_name: person.lastName,
    preferred_name: person.preferredName ?? null,
    date_of_birth: person.dateOfBirth ?? null,
    photo_url: person.photoUrl ?? null,

    cell_phone: person.cellPhone ?? null,
    personal_email: person.personalEmail ?? null,
    denison_email: person.denisonEmail ?? null,
    preferred_contact_method: person.preferredContactMethod ?? null,

    address_line1: person.addressLine1 ?? null,
    address_line2: person.addressLine2 ?? null,
    city: person.city ?? null,
    state: person.state ?? null,
    zip_code: person.zipCode ?? null,
    country: person.country ?? null,

    class_year: person.classYear ?? null,
    major: person.major ?? null,
    minor: person.minor ?? null,
    denison_id: person.denisonId ?? null,
    dorm: person.dorm ?? null,
    room_number: person.roomNumber ?? null,

    utr: person.utr ?? null,
    wtn: person.wtn ?? null,
    dominant_hand: person.dominantHand ?? null,
    height_inches: person.heightInches ?? null,
    weight_lbs: person.weightLbs ?? null,
    player_status: person.playerStatus ?? null,

    relationships: person.relationships,

    notes: person.notes ?? null,
  };
}

/** Build Person role/status refs from seed keys (for data.ts / import). */
export function personLookupsFromKeys(roleKey: string, statusKey: string): {
  roleId: string;
  statusId: string;
  role: LookupRef;
  status: LookupRef;
} {
  const role = roleSeedByKey(roleKey);
  const status = statusSeedByKey(statusKey);
  return {
    roleId: role.id,
    statusId: status.id,
    role: { id: role.id, key: role.key, label: role.label },
    status: { id: status.id, key: status.key, label: status.label },
  };
}
