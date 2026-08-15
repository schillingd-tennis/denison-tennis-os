/**
 * Boundary mapping between the `production_people` Supabase table and the
 * internal `Person` domain object (BP-015 / BP-021 / BP-025A / BP-038B).
 *
 * Writable column maps and `personToRow` keys derive from Field Catalog
 * `dbColumn` metadata. `rowToPerson` / `ProductionPersonRow` stay explicit
 * because they encode join shape and type coercion.
 */
import { ROLE_SEED, STATUS_SEED, roleSeedByKey, statusSeedByKey } from "@/features/lookups/seed";
import type { LookupRef } from "@/features/lookups/types";

import {
  getPersonFieldsWithDbColumn,
  getWritablePersonFieldMap,
} from "./fieldCatalog";
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
  middle_initial: string | null;
  last_name: string;
  preferred_name: string | null;
  full_legal_name: string | null;
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
  trn_rank: number | null;
  trn_star_rating: number | null;
  trn_url: string | null;
  utr_url: string | null;
  utr_matches_played: number | null;
  video_url: string | null;
  high_school: string | null;
  dominant_hand: string | null;
  height_inches: number | null;
  weight_lbs: number | null;
  player_status: string | null;
  social_security_number: string | null;
  tsa_known_traveler_number: string | null;
  passport_number: string | null;
  passport_expiration_date: string | null;
  seat_preference: string | null;
  relationships: PersonRelationship[] | null;
  notes: string | null;
  family_notes: string | null;
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
    middleInitial: undefinedIfNull(row.middle_initial),
    lastName: row.last_name,
    preferredName: undefinedIfNull(row.preferred_name),
    fullLegalName: undefinedIfNull(row.full_legal_name),
    photoUrl: undefinedIfNull(row.photo_url),

    dateOfBirth: undefinedIfNull(row.date_of_birth),

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
    trnRank: undefinedIfNull(row.trn_rank),
    trnStarRating: undefinedIfNull(row.trn_star_rating) as Person["trnStarRating"],
    trnUrl: undefinedIfNull(row.trn_url),
    utrUrl: undefinedIfNull(row.utr_url),
    utrMatchesPlayed: undefinedIfNull(row.utr_matches_played),
    videoUrl: undefinedIfNull(row.video_url),
    highSchool: undefinedIfNull(row.high_school),
    dominantHand: undefinedIfNull(row.dominant_hand) as Person["dominantHand"],
    heightInches: undefinedIfNull(row.height_inches),
    weightLbs: undefinedIfNull(row.weight_lbs),
    playerStatus: undefinedIfNull(row.player_status) as Person["playerStatus"],

    socialSecurityNumber: undefinedIfNull(row.social_security_number),
    tsaKnownTravelerNumber: undefinedIfNull(row.tsa_known_traveler_number),
    passportNumber: undefinedIfNull(row.passport_number),
    passportExpirationDate: undefinedIfNull(row.passport_expiration_date),
    seatPreference: undefinedIfNull(row.seat_preference) as Person["seatPreference"],

    relationships: row.relationships ?? [],

    notes: undefinedIfNull(row.notes),
    familyNotes: undefinedIfNull(row.family_notes),
  };
}

/** Domain key → Postgres column; derived from Field Catalog `dbColumn`. */
const WRITABLE_FIELD_MAP: Partial<Record<keyof Person, string>> =
  getWritablePersonFieldMap();

/**
 * Maps a Person write patch to a Supabase row fragment.
 * Present keys are written; `null` / missing optional values become SQL NULL
 * (BP-037A). Callers must include the key explicitly to clear a field.
 */
export function personPatchToRow(patch: Partial<Record<keyof Person, Person[keyof Person] | null>>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const key of Object.keys(patch) as (keyof Person)[]) {
    const rowKey = WRITABLE_FIELD_MAP[key];
    if (!rowKey) continue;

    // Key is present on the patch (including explicit null). Do not skip nulls.
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
  const row: Record<string, unknown> = {};

  for (const field of getPersonFieldsWithDbColumn()) {
    const dbColumn = field.dbColumn;
    if (!dbColumn) continue;

    const value = person[field.key];
    if (field.key === "relationships") {
      row[dbColumn] = value ?? [];
      continue;
    }
    if (
      field.key === "id" ||
      field.key === "createdAt" ||
      field.key === "updatedAt" ||
      field.key === "firstName" ||
      field.key === "lastName" ||
      field.key === "roleId" ||
      field.key === "statusId"
    ) {
      row[dbColumn] = value;
      continue;
    }
    row[dbColumn] = value ?? null;
  }

  return row;
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
