"use server";

/**
 * Client-safe read actions for People / Family (B2C boundary fix).
 *
 * Client Components must call these instead of importing repository or
 * personRelationships modules that pull in the server Supabase client
 * (`next/headers`). Same pattern as lookups `getRolesAction`.
 */

import {
  listRelationshipsByRelatedPerson,
  listRelationshipsForPerson,
  PersonRelationshipsRepositoryError,
  type PersonRelationshipRecord,
} from "./personRelationships";
import { getPersonById, listPeople, PeopleRepositoryError } from "./repository";
import type { Person } from "./types";

export type FamilyParentRowDto = {
  relationship: PersonRelationshipRecord;
  person: Person;
};

export async function listRelationshipsForPersonAction(
  personId: string,
): Promise<PersonRelationshipRecord[]> {
  try {
    return await listRelationshipsForPerson(personId);
  } catch (error) {
    if (error instanceof PersonRelationshipsRepositoryError) {
      console.error(`[listRelationshipsForPersonAction] ${error.message}`);
    } else {
      console.error("[listRelationshipsForPersonAction] Unexpected error", error);
    }
    return [];
  }
}

export async function listRelationshipsByRelatedPersonAction(
  relatedPersonId: string,
): Promise<PersonRelationshipRecord[]> {
  try {
    return await listRelationshipsByRelatedPerson(relatedPersonId);
  } catch (error) {
    if (error instanceof PersonRelationshipsRepositoryError) {
      console.error(`[listRelationshipsByRelatedPersonAction] ${error.message}`);
    } else {
      console.error("[listRelationshipsByRelatedPersonAction] Unexpected error", error);
    }
    return [];
  }
}

export async function getPersonByIdAction(id: string): Promise<Person | null> {
  try {
    return await getPersonById(id);
  } catch (error) {
    if (error instanceof PeopleRepositoryError) {
      console.error(`[getPersonByIdAction] ${error.message}`);
    } else {
      console.error("[getPersonByIdAction] Unexpected error", error);
    }
    return null;
  }
}

export async function listPeopleAction(): Promise<Person[]> {
  try {
    return await listPeople();
  } catch (error) {
    if (error instanceof PeopleRepositoryError) {
      console.error(`[listPeopleAction] ${error.message}`);
    } else {
      console.error("[listPeopleAction] Unexpected error", error);
    }
    return [];
  }
}

/** Family workspace load: relationships + related Person rows. */
export async function loadFamilyParentsForPlayerAction(
  playerId: string,
): Promise<FamilyParentRowDto[]> {
  try {
    const relationships = await listRelationshipsForPerson(playerId);
    const rows: FamilyParentRowDto[] = [];
    for (const relationship of relationships) {
      const person = await getPersonById(relationship.relatedPersonId);
      if (person) {
        rows.push({ relationship, person });
      }
    }
    return rows;
  } catch (error) {
    if (
      error instanceof PersonRelationshipsRepositoryError ||
      error instanceof PeopleRepositoryError
    ) {
      console.error(`[loadFamilyParentsForPlayerAction] ${error.message}`);
    } else {
      console.error("[loadFamilyParentsForPlayerAction] Unexpected error", error);
    }
    return [];
  }
}
