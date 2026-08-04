/**
 * People repository (BP-015).
 *
 * The Team module's only sanctioned way to read `Person` records. Per
 * `docs/ARCHITECTURE.md` §3D/§9, this is the stable interface pages and
 * components call — they must not import `src/lib/supabase.ts` or the
 * `production_people` table shape directly.
 *
 * Read-only for now: BP-015 moves reads off `data.ts` and onto Supabase.
 * Create/update operations are out of scope until a later blueprint (see
 * `docs/ARCHITECTURE.md` §13, "reads before writes").
 */
import { supabase } from "@/lib/supabase";

import type { Person } from "./types";
import { rowToPerson, type ProductionPersonRow } from "./supabaseMapping";

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
