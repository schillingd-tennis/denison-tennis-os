/**
 * Boundary mapping between the `production_people` Supabase table and the
 * internal `Person` domain object (BP-015). Per `docs/ARCHITECTURE.md` §11,
 * this is the one place allowed to know the table's column names — nothing
 * outside `src/features/people/repository.ts` and `scripts/generate-supabase-seed.ts`
 * should import this module.
 */
import type { Person, PersonRelationship } from "./types";

/** Shape of a row as returned by `select("*")` on `production_people`. */
export type ProductionPersonRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
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

/** Maps a `production_people` row into the `Person` shape the app already uses. */
export function rowToPerson(row: ProductionPersonRow): Person {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    status: row.status as Person["status"],
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

/** Maps a `Person` into a `production_people` row for inserts/upserts. */
export function personToRow(person: Person): Record<string, unknown> {
  return {
    id: person.id,
    created_at: person.createdAt,
    updated_at: person.updatedAt,

    status: person.status,
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
