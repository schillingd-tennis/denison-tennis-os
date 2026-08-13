"use server";

/**
 * Parent create/link Server Actions (B2B).
 *
 * Create New Parent → atomic RPC (Person role=family + relationship).
 * Link Existing → relationship edge only (Option A: never changes Person role).
 * Source person must be role = player. No Family UI in this phase.
 */

import { revalidatePath } from "next/cache";

import { ROLE_KEYS } from "@/features/lookups/seed";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createParentForPlayer,
  createPersonRelationship,
  deletePersonRelationship,
  isPersonRelationshipType,
  listRelationshipsForPerson,
  PersonRelationshipsRepositoryError,
  type PersonRelationshipRecord,
  type PersonRelationshipType,
} from "./personRelationships";
import { getPersonById, PeopleRepositoryError } from "./repository";
import type { Person } from "./types";
import { hasRole } from "./utils";

export type CreateParentActionInput = {
  playerId: string;
  firstName: string;
  lastName: string;
  relationshipType: string;
  email?: string;
  phone?: string;
};

export type LinkParentActionInput = {
  playerId: string;
  relatedPersonId: string;
  relationshipType: string;
};

export type CreateParentActionResult =
  | {
      success: true;
      parent: Person;
      relationship: PersonRelationshipRecord;
    }
  | { success: false; error: string };

export type LinkParentActionResult =
  | {
      success: true;
      relatedPerson: Person;
      relationship: PersonRelationshipRecord;
    }
  | { success: false; error: string };

export type RemoveParentFromFamilyInput = {
  playerId: string;
  relationshipId: string;
};

export type RemoveParentFromFamilyResult =
  | { success: true }
  | { success: false; error: string };

async function requireAuthenticatedUser(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your session has expired. Please sign in again to save changes.",
    };
  }

  return { ok: true };
}

function normalizeRequiredName(value: string | undefined, field: string): string | { error: string } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { error: `${field} is required.` };
  return trimmed;
}

function normalizeRelationshipType(
  value: string,
): PersonRelationshipType | { error: string } {
  const normalized = value.trim().toLowerCase();
  if (!isPersonRelationshipType(normalized)) {
    return { error: "Relationship type must be Mother, Father, Guardian, or Other." };
  }
  return normalized;
}

async function requirePlayerSource(
  playerId: string,
): Promise<{ ok: true; player: Person } | { ok: false; error: string }> {
  const player = await getPersonById(playerId);
  if (!player) {
    return { ok: false, error: "Player not found." };
  }
  if (!hasRole(player, ROLE_KEYS.player)) {
    return { ok: false, error: "Parents can only be linked to a Person with role Player." };
  }
  return { ok: true, player };
}

function revalidatePlayerPaths(playerId: string) {
  revalidatePath(`/team/${playerId}`);
  revalidatePath("/team");
  revalidatePath("/people");
}

/** Create New Parent: Person (family/current) + relationship edge, atomically. */
export async function createParentForPlayerAction(
  input: CreateParentActionInput,
): Promise<CreateParentActionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const firstName = normalizeRequiredName(input.firstName, "First name");
  if (typeof firstName === "object") return { success: false, error: firstName.error };

  const lastName = normalizeRequiredName(input.lastName, "Last name");
  if (typeof lastName === "object") return { success: false, error: lastName.error };

  const relationshipType = normalizeRelationshipType(input.relationshipType);
  if (typeof relationshipType === "object") {
    return { success: false, error: relationshipType.error };
  }

  const source = await requirePlayerSource(input.playerId);
  if (!source.ok) return { success: false, error: source.error };

  try {
    const created = await createParentForPlayer({
      playerId: input.playerId,
      firstName,
      lastName,
      relationshipType,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
    });

    const parent = await getPersonById(created.parentId);
    if (!parent) {
      return {
        success: false,
        error: "Parent was created but could not be loaded. Please refresh and try again.",
      };
    }

    const relationships = await listRelationshipsForPerson(input.playerId);
    const relationship = relationships.find((edge) => edge.id === created.relationshipId);
    if (!relationship) {
      return {
        success: false,
        error: "Parent was created but the relationship could not be loaded. Please refresh.",
      };
    }

    revalidatePlayerPaths(input.playerId);
    return { success: true, parent, relationship };
  } catch (error) {
    if (
      error instanceof PersonRelationshipsRepositoryError ||
      error instanceof PeopleRepositoryError
    ) {
      console.error(`[createParentForPlayerAction] ${error.message}`);
    } else {
      console.error("[createParentForPlayerAction] Unexpected error", error);
    }
    return {
      success: false,
      error: "We couldn't create the parent. Please try again.",
    };
  }
}

/**
 * Link Existing Person as a parent.
 * Inserts a relationship edge only — never updates the related Person's role.
 */
export async function linkPersonAsParentAction(
  input: LinkParentActionInput,
): Promise<LinkParentActionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const relationshipType = normalizeRelationshipType(input.relationshipType);
  if (typeof relationshipType === "object") {
    return { success: false, error: relationshipType.error };
  }

  if (!input.relatedPersonId?.trim()) {
    return { success: false, error: "Related person is required." };
  }

  if (input.playerId === input.relatedPersonId) {
    return { success: false, error: "A person cannot be linked as a parent of themselves." };
  }

  const source = await requirePlayerSource(input.playerId);
  if (!source.ok) return { success: false, error: source.error };

  const relatedPerson = await getPersonById(input.relatedPersonId);
  if (!relatedPerson) {
    return { success: false, error: "Related person not found." };
  }

  const existing = await listRelationshipsForPerson(input.playerId);
  if (existing.some((edge) => edge.relatedPersonId === input.relatedPersonId)) {
    return { success: false, error: "That person is already linked to this player." };
  }

  // Capture role before link to assert Option A (edge-only write).
  const roleBefore = relatedPerson.roleId;

  try {
    const relationship = await createPersonRelationship({
      playerId: input.playerId,
      relatedPersonId: input.relatedPersonId,
      relationshipType,
    });

    const relatedAfter = await getPersonById(input.relatedPersonId);
    if (!relatedAfter) {
      return {
        success: false,
        error: "Link succeeded but the related person could not be reloaded.",
      };
    }

    // Option A: link path never updates Person — role must be unchanged.
    if (relatedAfter.roleId !== roleBefore) {
      console.error(
        `[linkPersonAsParentAction] Option A violation: role changed for "${input.relatedPersonId}"`,
      );
    }

    revalidatePlayerPaths(input.playerId);
    return { success: true, relatedPerson: relatedAfter, relationship };
  } catch (error) {
    if (error instanceof PersonRelationshipsRepositoryError) {
      console.error(`[linkPersonAsParentAction] ${error.message}`);
      if (error.message.includes("already linked")) {
        return { success: false, error: "That person is already linked to this player." };
      }
      if (error.message.includes("themselves")) {
        return {
          success: false,
          error: "A person cannot be linked as a parent of themselves.",
        };
      }
    } else {
      console.error("[linkPersonAsParentAction] Unexpected error", error);
    }
    return {
      success: false,
      error: "We couldn't link that person. Please try again.",
    };
  }
}

/**
 * Remove from Family (BP-040E): delete the relationship edge only.
 * Does not delete the parent Person or any other relationships.
 */
export async function removeParentFromFamilyAction(
  input: RemoveParentFromFamilyInput,
): Promise<RemoveParentFromFamilyResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.relationshipId?.trim()) {
    return { success: false, error: "Relationship is required." };
  }

  const source = await requirePlayerSource(input.playerId);
  if (!source.ok) return { success: false, error: source.error };

  const relationships = await listRelationshipsForPerson(input.playerId);
  const edge = relationships.find((row) => row.id === input.relationshipId);
  if (!edge) {
    return { success: false, error: "That parent is not linked to this player." };
  }

  try {
    await deletePersonRelationship(edge.id);
    revalidatePlayerPaths(input.playerId);
    revalidatePath(`/team/${edge.relatedPersonId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof PersonRelationshipsRepositoryError) {
      console.error(`[removeParentFromFamilyAction] ${error.message}`);
    } else {
      console.error("[removeParentFromFamilyAction] Unexpected error", error);
    }
    return {
      success: false,
      error: "We couldn't remove that parent. Please try again.",
    };
  }
}
