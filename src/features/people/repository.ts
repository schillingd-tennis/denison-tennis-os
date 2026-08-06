/**
 * People repository (BP-015; writes BP-017; lookups BP-025A; SoR BP-029A).
 *
 * Runtime reads and writes go only to Supabase `production_people`.
 * Airtable/import adapters must never be called from this layer.
 */
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Person } from "./types";
import { personPatchToRow, rowToPerson, type ProductionPersonRow } from "./supabaseMapping";

const TABLE = "production_people";

/** Join role/status lookups on every read. */
const PERSON_SELECT = `
  *,
  role:roles!role_id ( id, key, label, sort_order, active ),
  status:statuses!status_id ( id, key, label, sort_order, active )
`;

export class PeopleRepositoryError extends Error {}

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
 */
export async function updatePerson(id: string, patch: Partial<Person>): Promise<Person> {
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
