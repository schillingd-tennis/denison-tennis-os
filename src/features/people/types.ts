/**
 * The Person data model — the system-of-record identity for anyone tracked in
 * Denison Tennis OS. Role and status are foreign keys into lookup tables
 * (BP-025A). See docs/SYSTEM_OF_RECORD.md.
 *
 * Internal domain name: People. User-facing Team navigation still routes to
 * `/team` (BP-021).
 */

import type { LookupRef } from "@/features/lookups/types";

export type DominantHand = "right" | "left";
export type PlayerStatus = "active" | "injured" | "inactive" | "graduated";
export type ContactMethod = "phone" | "text" | "email";

/**
 * How another record relates to this person (e.g. a parent). Populated
 * starting with a later blueprint (parent import) — every player imported
 * in BP-012 has this initialized to an empty array as a placeholder.
 */
export type RelationshipType = "parent" | "guardian" | "sibling" | "coach" | "other";

export type PersonRelationship = {
  personId: string;
  relationship: RelationshipType;
};

export type Person = {
  // System
  id: string;
  createdAt: string;
  updatedAt: string;

  // Identity — role/status are lookup FKs (BP-025A); never infer one from the other.
  roleId: string;
  statusId: string;
  /** Joined role lookup (id/key/label). */
  role: LookupRef;
  /** Joined status lookup (id/key/label). */
  status: LookupRef;
  /** Job / coaching title when applicable (e.g. "Head Coach"). */
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  photoUrl?: string;

  // Contact
  cellPhone?: string;
  personalEmail?: string;
  denisonEmail?: string;
  preferredContactMethod?: ContactMethod;

  // Permanent Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Denison Information
  classYear?: number;
  major?: string;
  minor?: string;
  denisonId?: string;
  dorm?: string;
  roomNumber?: string;

  // Tennis Information
  utr?: number;
  wtn?: number;
  dominantHand?: DominantHand;
  heightInches?: number;
  weightLbs?: number;
  playerStatus?: PlayerStatus;

  // Relationships
  relationships: PersonRelationship[];

  // Notes
  /** Free-text operational notes. Edited via the Universal Person Editor (BP-013). */
  notes?: string;
};
