/**
 * Person↔Person relationships (B2A / BP-039B).
 *
 * Edge store for Parents/Guardians and future relationship types.
 * Distinct from the unused `Person.relationships` jsonb stub and from
 * demo `FamilyContact` data — those remain until a later UI cutover.
 *
 * Direction: `personId` = source (player), `relatedPersonId` = related
 * (parent/guardian). Inverse: list by related person.
 */

import { supabase } from "@/lib/supabase";

/** Stable storage keys; UI labels are Mother / Father / Guardian / Other. */
export type PersonRelationshipType = "mother" | "father" | "guardian" | "other";

export const PERSON_RELATIONSHIP_TYPE_LABELS: Record<PersonRelationshipType, string> = {
  mother: "Mother",
  father: "Father",
  guardian: "Guardian",
  other: "Other",
};

export type PersonRelationshipRecord = {
  id: string;
  /** Source person (typically a player). */
  personId: string;
  /** Related person (typically a parent/guardian). */
  relatedPersonId: string;
  relationshipType: PersonRelationshipType;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  createdAt: string;
  updatedAt: string;
};

type PersonRelationshipRow = {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: string;
  is_primary_contact: boolean;
  is_emergency_contact: boolean;
  created_at: string;
  updated_at: string;
};

const TABLE = "person_relationships";

const RELATIONSHIP_TYPE_SET = new Set<string>([
  "mother",
  "father",
  "guardian",
  "other",
]);

export class PersonRelationshipsRepositoryError extends Error {}

function asRelationshipType(value: string): PersonRelationshipType {
  if (!RELATIONSHIP_TYPE_SET.has(value)) {
    throw new PersonRelationshipsRepositoryError(
      `Unknown relationship_type "${value}" on person_relationships row.`,
    );
  }
  return value as PersonRelationshipType;
}

export function rowToPersonRelationship(
  row: PersonRelationshipRow,
): PersonRelationshipRecord {
  return {
    id: row.id,
    personId: row.person_id,
    relatedPersonId: row.related_person_id,
    relationshipType: asRelationshipType(row.relationship_type),
    isPrimaryContact: row.is_primary_contact,
    isEmergencyContact: row.is_emergency_contact,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Relationships where `personId` is the source (e.g. a player's parents). */
export async function listRelationshipsForPerson(
  personId: string,
): Promise<PersonRelationshipRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new PersonRelationshipsRepositoryError(
      `Failed to load relationships for person "${personId}": ${error.message}`,
    );
  }

  return ((data ?? []) as PersonRelationshipRow[]).map(rowToPersonRelationship);
}

/**
 * Relationships where `relatedPersonId` is the related party
 * (e.g. a parent's linked players).
 */
export async function listRelationshipsByRelatedPerson(
  relatedPersonId: string,
): Promise<PersonRelationshipRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("related_person_id", relatedPersonId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new PersonRelationshipsRepositoryError(
      `Failed to load relationships for related person "${relatedPersonId}": ${error.message}`,
    );
  }

  return ((data ?? []) as PersonRelationshipRow[]).map(rowToPersonRelationship);
}
