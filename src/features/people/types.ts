/**
 * The Person data model — the system-of-record identity for anyone tracked in
 * Denison Tennis OS. Role and status are foreign keys into lookup tables
 * (BP-025A). See docs/SYSTEM_OF_RECORD.md.
 *
 * Field metadata (labels, sections, sensitivity, enum options) lives in
 * `fieldCatalog.ts` (BP-036A / BP-036E) — do not redefine fields in modules.
 *
 * Internal domain name: People. User-facing Team navigation still routes to
 * `/team` (BP-021).
 */

import type { LookupRef } from "@/features/lookups/types";

export type DominantHand = "right" | "left";
export type PlayerStatus = "active" | "injured" | "inactive" | "graduated";
export type ContactMethod = "phone" | "text" | "email";

/**
 * Coach designations stored on production_people.title (Team Role column).
 * Not Person roles — role stays `coach`; title is the display designation.
 */
export const COACH_DESIGNATIONS = [
  "Head Coach",
  "Coach",
  "Assistant Coach",
] as const;

export type CoachDesignation = (typeof COACH_DESIGNATIONS)[number];

/**
 * Preferred aircraft seat when traveling with the program (BP-036A / BP-036E).
 * Stable storage keys; display labels live in the field catalog.
 */
export type SeatPreference =
  | "window"
  | "aisle"
  | "middle"
  | "exit_row"
  | "bulkhead"
  | "no_preference";

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
  /** Single character preferred (BP-036A). */
  middleInitial?: string;
  lastName: string;
  preferredName?: string;
  /** Legal name as it appears on travel documents (BP-036A). */
  fullLegalName?: string;
  photoUrl?: string;

  // Personal Information — biographical facts that belong once on the Person (BP-036A).
  /** ISO date. Canonical home for DOB; do not duplicate elsewhere. */
  dateOfBirth?: string;

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

  // Travel — identity / preference fields on Person (BP-036A / BP-036E). UI later.
  /** Sensitive; catalog type secureText. */
  socialSecurityNumber?: string;
  tsaKnownTravelerNumber?: string;
  /** Sensitive; catalog type secureText (BP-036E). */
  passportNumber?: string;
  /** ISO date. */
  passportExpirationDate?: string;
  seatPreference?: SeatPreference;

  // Relationships
  relationships: PersonRelationship[];

  // Notes
  /** Free-text operational notes. Edited via the Universal Person Editor (BP-013). */
  notes?: string;
  /**
   * Player-level Family workspace notes (siblings, dynamics, recruiting context).
   * Distinct from `notes` (individual / parent Contact Information notes).
   */
  familyNotes?: string;
};

/**
 * Patch accepted by Person write path (BP-037A).
 *
 * `null` clears a nullable column. Do **not** send `undefined` for clears —
 * Next.js Server Action serialization drops `undefined` keys, which silently
 * turns a clear into a no-op and restores the previous value.
 */
export type PersonWritePatch = {
  [K in keyof Person]?: Person[K] | null;
};
