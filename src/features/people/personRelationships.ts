/**
 * Person↔Person relationships (B2A read / B2B write).
 *
 * Edge store for Parents/Guardians and future relationship types.
 * Distinct from the unused `Person.relationships` jsonb stub and from
 * demo `FamilyContact` data — those remain until a later UI cutover.
 *
 * Direction: `personId` = source (player in B2B), `relatedPersonId` = related
 * (parent/guardian). Inverse: list by related person.
 *
 * Link Existing (Option A): insert edge only — never updates Person.role_id.
 * Create New Parent: atomic RPC `create_parent_for_player`.
 */

import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  /** Source person (player in B2B). */
  personId: string;
  /** Related person (parent/guardian). */
  relatedPersonId: string;
  relationshipType: PersonRelationshipType;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateParentForPlayerInput = {
  playerId: string;
  firstName: string;
  lastName: string;
  relationshipType: PersonRelationshipType;
  email?: string;
  phone?: string;
};

export type CreateParentForPlayerResult = {
  parentId: string;
  relationshipId: string;
};

export type LinkPersonAsParentInput = {
  playerId: string;
  relatedPersonId: string;
  relationshipType: PersonRelationshipType;
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

export function isPersonRelationshipType(value: string): value is PersonRelationshipType {
  return RELATIONSHIP_TYPE_SET.has(value);
}

function asRelationshipType(value: string): PersonRelationshipType {
  if (!isPersonRelationshipType(value)) {
    throw new PersonRelationshipsRepositoryError(
      `Unknown relationship_type "${value}" on person_relationships row.`,
    );
  }
  return value;
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

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return Boolean(error.message?.toLowerCase().includes("duplicate"));
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

/**
 * Atomic Create New Parent (B2B): inserts Person (family/current) + relationship.
 * Source player role is enforced inside the RPC and again by callers.
 */
export async function createParentForPlayer(
  input: CreateParentForPlayerInput,
): Promise<CreateParentForPlayerResult> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("create_parent_for_player", {
    p_player_id: input.playerId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_relationship_type: input.relationshipType,
    p_personal_email: input.email ?? null,
    p_cell_phone: input.phone ?? null,
  });

  if (error) {
    throw new PersonRelationshipsRepositoryError(
      `Failed to create parent for player "${input.playerId}": ${error.message}`,
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  const parentId = row?.parent_id;
  const relationshipId = row?.relationship_id;

  if (typeof parentId !== "string" || typeof relationshipId !== "string") {
    throw new PersonRelationshipsRepositoryError(
      `create_parent_for_player returned an unexpected payload for player "${input.playerId}".`,
    );
  }

  return { parentId, relationshipId };
}

/**
 * Link Existing Person as a parent (B2B).
 * Inserts a relationship edge only — never updates the related Person's role.
 */
export async function createPersonRelationship(
  input: LinkPersonAsParentInput,
): Promise<PersonRelationshipRecord> {
  if (input.playerId === input.relatedPersonId) {
    throw new PersonRelationshipsRepositoryError(
      "Cannot link a person as a parent of themselves.",
    );
  }

  if (!isPersonRelationshipType(input.relationshipType)) {
    throw new PersonRelationshipsRepositoryError(
      `Invalid relationship_type "${input.relationshipType}".`,
    );
  }

  const client = await createSupabaseServerClient();
  const id = crypto.randomUUID();

  const { data, error } = await client
    .from(TABLE)
    .insert({
      id,
      person_id: input.playerId,
      related_person_id: input.relatedPersonId,
      relationship_type: input.relationshipType,
      is_primary_contact: false,
      is_emergency_contact: false,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new PersonRelationshipsRepositoryError(
        `Person "${input.relatedPersonId}" is already linked to player "${input.playerId}".`,
      );
    }
    throw new PersonRelationshipsRepositoryError(
      `Failed to create relationship for player "${input.playerId}": ${error.message}`,
    );
  }

  if (!data) {
    throw new PersonRelationshipsRepositoryError(
      `Failed to create relationship for player "${input.playerId}": no row returned.`,
    );
  }

  return rowToPersonRelationship(data as PersonRelationshipRow);
}
