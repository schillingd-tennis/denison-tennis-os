import type { ContactMethod } from "./types";

/**
 * Family & Contacts.
 *
 * A family contact (parent/guardian) is a related person tied to a player
 * record by `personId`. For this sprint they are modeled as a lighter,
 * parallel record — not the full `Person` shape, since a guardian doesn't
 * have Denison/tennis information — but conceptually they represent the
 * same idea: a real person related to someone in the OS. See
 * docs/DATA_MODEL.md for more.
 *
 * Local sample data only, temporary in the same way as `data.ts`.
 */

export type FamilyRelationship = "Mother" | "Father" | "Guardian";

export type FamilyContact = {
  id: string;
  personId: string;
  firstName: string;
  lastName: string;
  relationship: FamilyRelationship;
  photoUrl?: string;
  cellPhone?: string;
  email?: string;
  preferredContactMethod?: ContactMethod;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
};

export const familyContacts: FamilyContact[] = [
  {
    id: "fc-001",
    personId: "p-001",
    firstName: "Karen",
    lastName: "Bennett",
    relationship: "Mother",
    cellPhone: "(614) 555-0201",
    email: "karen.bennett@gmail.com",
    preferredContactMethod: "phone",
    isPrimaryContact: true,
    isEmergencyContact: true,
  },
  {
    id: "fc-002",
    personId: "p-001",
    firstName: "David",
    lastName: "Bennett",
    relationship: "Father",
    cellPhone: "(614) 555-0202",
    email: "david.bennett@gmail.com",
    preferredContactMethod: "text",
    isEmergencyContact: true,
  },
  {
    id: "fc-003",
    personId: "p-003",
    firstName: "Linda",
    lastName: "Whitman",
    relationship: "Mother",
    cellPhone: "(216) 555-0221",
    email: "linda.whitman@gmail.com",
    preferredContactMethod: "email",
    isPrimaryContact: true,
    isEmergencyContact: true,
  },
  {
    id: "fc-004",
    personId: "p-005",
    firstName: "Susan",
    lastName: "Park",
    relationship: "Mother",
    cellPhone: "(312) 555-0241",
    email: "susan.park@gmail.com",
    isPrimaryContact: true,
  },
  {
    id: "fc-005",
    personId: "p-005",
    firstName: "Michael",
    lastName: "Park",
    relationship: "Father",
    cellPhone: "(312) 555-0242",
    email: "michael.park@gmail.com",
    preferredContactMethod: "phone",
    isEmergencyContact: true,
  },
];

export function getFamilyContactsForPerson(
  contacts: FamilyContact[],
  personId: string,
): FamilyContact[] {
  return contacts.filter((contact) => contact.personId === personId);
}
