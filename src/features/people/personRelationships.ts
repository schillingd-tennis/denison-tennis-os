/**
 * Person↔Person relationships repository (B2A read / B2B write).
 *
 * Types/labels: `personRelationshipTypes.ts` (client-safe).
 * Client Components must not import this module — use peopleReadActions /
 * parentActions instead (server action boundary).
 */

import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  isPersonRelationshipType,
  type CreateParentForPlayerInput,
  type CreateParentForPlayerResult,
  type LinkPersonAsParentInput,
  type PersonRelationshipRecord,
  type PersonRelationshipType,
} from "./personRelationshipTypes";

export type {
  CreateParentForPlayerInput,
  CreateParentForPlayerResult,
  LinkPersonAsParentInput,
  PersonRelationshipRecord,
  PersonRelationshipType,
} from "./personRelationshipTypes";
export {
  isPersonRelationshipType,
  PERSON_RELATIONSHIP_TYPE_LABELS,
} from "./personRelationshipTypes";

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

export class PersonRelationshipsRepositoryError extends Error {}

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
