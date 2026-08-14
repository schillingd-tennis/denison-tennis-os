/**
 * People repository (BP-015; writes BP-017; lookups BP-025A; SoR BP-029A;
 * lifecycle BP-041).
 *
 * Runtime reads and writes go only to Supabase `production_people`.
 * Airtable/import adapters must never be called from this layer.
 */
import {
  STATUS_KEYS,
  roleIdForKey,
  statusIdForKey,
  type RoleKey,
  type StatusKey,
} from "@/features/lookups/seed";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Person, PersonWritePatch, PlayerStatus } from "./types";
import { personPatchToRow, rowToPerson, type ProductionPersonRow } from "./supabaseMapping";

const TABLE = "production_people";

/** Join role/status lookups on every read. */
const PERSON_SELECT = `
  *,
  role:roles!role_id ( id, key, label, sort_order, active ),
  status:statuses!status_id ( id, key, label, sort_order, active )
`;

export class PeopleRepositoryError extends Error {}

/** Input for creating a production Person row (BP-041). */
export type CreatePersonInput = {
  firstName: string;
  lastName: string;
  /** Lookup key — resolved to the seeded role UUID. */
  roleKey: RoleKey;
  /** Lookup key — resolved to the seeded status UUID. Defaults to current. */
  statusKey?: StatusKey;
  classYear?: number;
  playerStatus?: PlayerStatus;
};

const PLAYER_STATUS_VALUES = new Set<PlayerStatus>([
  "active",
  "injured",
  "inactive",
  "graduated",
]);

/** All people in the People database, sorted by last name then first name. */
export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(PERSON_SELECT)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    throw new PeopleRepositoryError(`Failed to load people from Supabase: ${error.message}`);
  }

  return (data as ProductionPersonRow[]).map(rowToPerson);
}

/** A single person by id, or `null` if no such person exists. */
export async function getPersonById(id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(PERSON_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new PeopleRepositoryError(`Failed to load person "${id}" from Supabase: ${error.message}`);
  }

  return data ? rowToPerson(data as ProductionPersonRow) : null;
}

/**
 * Updates a single person, writing only the fields present on `patch`.
 * Pass `null` to clear a nullable column (BP-037A). `undefined` keys are not
 * reliable across the Server Action boundary and must not mean "clear".
 */
export async function updatePerson(id: string, patch: PersonWritePatch): Promise<Person> {
  const patchRow = personPatchToRow(patch);

  if (Object.keys(patchRow).length === 0) {
    const current = await getPersonById(id);
    if (!current) {
      throw new PeopleRepositoryError(`Cannot update person "${id}": no such person.`);
    }
    return current;
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .update(patchRow)
    .eq("id", id)
    .select(PERSON_SELECT)
    .maybeSingle();

  if (error) {
    throw new PeopleRepositoryError(`Failed to update person "${id}" in Supabase: ${error.message}`);
  }

  if (!data) {
    throw new PeopleRepositoryError(`Cannot update person "${id}": no such person.`);
  }

  return rowToPerson(data as ProductionPersonRow);
}

/**
 * Inserts a new Person into `production_people` (BP-041).
 * IDs use UUID text (same approach as create_parent_for_player RPC).
 */
export async function createPerson(input: CreatePersonInput): Promise<Person> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName) {
    throw new PeopleRepositoryError("first_name is required.");
  }
  if (!lastName) {
    throw new PeopleRepositoryError("last_name is required.");
  }

  let roleId: string;
  let statusId: string;
  try {
    roleId = roleIdForKey(input.roleKey);
    statusId = statusIdForKey(input.statusKey ?? STATUS_KEYS.current);
  } catch (error) {
    throw new PeopleRepositoryError(
      error instanceof Error ? error.message : "Invalid role or status key.",
    );
  }

  if (input.playerStatus !== undefined && !PLAYER_STATUS_VALUES.has(input.playerStatus)) {
    throw new PeopleRepositoryError(`Invalid player_status: ${input.playerStatus}`);
  }

  if (input.classYear !== undefined) {
    if (!Number.isInteger(input.classYear) || input.classYear < 1900 || input.classYear > 2200) {
      throw new PeopleRepositoryError("class_year must be a valid year.");
    }
  }

  const id = crypto.randomUUID();
  const row: Record<string, unknown> = {
    id,
    role_id: roleId,
    status_id: statusId,
    first_name: firstName,
    last_name: lastName,
    relationships: [],
  };

  if (input.classYear !== undefined) {
    row.class_year = input.classYear;
  }
  if (input.playerStatus !== undefined) {
    row.player_status = input.playerStatus;
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .insert(row)
    .select(PERSON_SELECT)
    .maybeSingle();

  if (error) {
    throw new PeopleRepositoryError(`Failed to create person in Supabase: ${error.message}`);
  }

  if (!data) {
    throw new PeopleRepositoryError("Failed to create person: no row returned.");
  }

  return rowToPerson(data as ProductionPersonRow);
}

/**
 * Hard-deletes a Person from `production_people` (BP-041).
 * Cascades only `person_relationships` edges involving this Person.
 * Does not delete any other Person records.
 */
export async function deletePerson(id: string): Promise<void> {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new PeopleRepositoryError("Person id is required.");
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TABLE)
    .delete()
    .eq("id", trimmed)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new PeopleRepositoryError(
      `Failed to delete person "${trimmed}" in Supabase: ${error.message}`,
    );
  }

  if (!data) {
    throw new PeopleRepositoryError(`Cannot delete person "${trimmed}": no such person.`);
  }
}
