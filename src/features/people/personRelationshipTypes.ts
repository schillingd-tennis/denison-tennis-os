/**
 * Client-safe Person relationship types and labels (no Supabase / next/headers).
 * Repository I/O lives in personRelationships.ts (server-capable).
 */

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

const RELATIONSHIP_TYPE_SET = new Set<string>([
  "mother",
  "father",
  "guardian",
  "other",
]);

export function isPersonRelationshipType(value: string): value is PersonRelationshipType {
  return RELATIONSHIP_TYPE_SET.has(value);
}
