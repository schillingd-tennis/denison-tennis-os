/**
 * The Person data model — the system-of-record identity for anyone tracked in
 * Denison Tennis OS (players, coaches, alumni, recruits, staff, …). Future
 * modules reference the same record rather than re-modeling people separately.
 * See docs/SYSTEM_OF_RECORD.md.
 *
 * Internal domain name: People. User-facing Team navigation still routes to
 * `/team` (BP-021).
 */

export type PersonStatus = "current" | "alumni";
export type DominantHand = "right" | "left";
export type PlayerStatus = "active" | "injured" | "inactive" | "graduated";
export type ContactMethod = "phone" | "text" | "email";

/**
 * What a Person *is* within the program. A person may hold more than one
 * role (e.g. alumni + coach) without duplicating the Person record.
 * Distinct from `status` / `playerStatus` (lifecycle / tennis standing).
 *
 * `recruit` is part of the core role vocabulary (BP-022A). Future roles
 * (`parent`, `donor`) attach to the same Person — never a parallel record.
 */
export type PersonRole = "player" | "coach" | "alumni" | "staff" | "recruit";

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

  // Identity
  status: PersonStatus;
  /** Program roles; may contain more than one value. */
  roles: PersonRole[];
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
