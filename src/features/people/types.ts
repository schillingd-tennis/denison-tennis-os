/**
 * The Person data model — the single source of truth for anyone tracked in
 * Denison Tennis OS (current players and alumni today; future modules will
 * reference the same record rather than re-modeling people separately).
 *
 * This currently lives in a local TypeScript module (see `data.ts`) and is
 * intentionally shaped so it can be swapped for a real database later
 * without changing the fields consumers rely on.
 */

export type PersonStatus = "current" | "alumni";
export type DominantHand = "right" | "left";
export type PlayerStatus = "active" | "injured" | "inactive" | "graduated";
export type ContactMethod = "phone" | "text" | "email";

export type Person = {
  // System
  id: string;
  createdAt: string;
  updatedAt: string;

  // Identity
  status: PersonStatus;
  firstName: string;
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
};
