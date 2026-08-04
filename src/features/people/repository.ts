/**
 * People repository (BP-015; writes added in BP-017 Phase 1).
 *
 * The Team module's only sanctioned way to read and write `Person` records.
 * Per `docs/ARCHITECTURE.md` §3D/§9, this is the stable interface pages,
 * components, and Server Actions call — they must not import
 * `src/lib/supabase.ts`/`src/lib/supabase/server.ts` or the
 * `production_people` table shape directly.
 */
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Person } from "./types";
import { personPatchToRow, rowToPerson, type ProductionPersonRow } from "./supabaseMapping";

const TABLE = "production_people";

export class PeopleRepositoryError extends Error {}

/** All people (current players and alumni), sorted by last name then first name. */
export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    throw new PeopleRepositoryError(`Failed to load people from Supabase: ${error.message}`);
  }

  return (data as ProductionPersonRow[]).map(rowToPerson);
}

/** A single person by id, or `null` if no such person exists. */
export async function getPersonById(id: string): Promise<Person | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new PeopleRepositoryError(`Failed to load person "${id}" from Supabase: ${error.message}`);
  }

  return data ? rowToPerson(data as ProductionPersonRow) : null;
}

/**
 * Updates a single person, writing only the fields present on `patch`
 * (BP-017 Phase 1). Uses the cookie-backed, auth-aware server client (not
 * the anon `supabase` singleton above) because `production_people`'s
 * row-level security only grants UPDATE to the `authenticated` role — see
 * `supabase/migrations/0002_allow_authenticated_update_production_people.sql`.
 * Callers (Server Actions) must therefore invoke this from a request
 * context where the user's session cookie is available.
 *
 * Throws `PeopleRepositoryError` if the person doesn't exist or the update
 * is rejected (e.g. by RLS, a check constraint, or a network error).
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
  const { data, error } = await client.from(TABLE).update(patchRow).eq("id", id).select().maybeSingle();

  if (error) {
    throw new PeopleRepositoryError(`Failed to update person "${id}" in Supabase: ${error.message}`);
  }

  if (!data) {
    throw new PeopleRepositoryError(`Cannot update person "${id}": no such person.`);
  }

  return rowToPerson(data as ProductionPersonRow);
}
