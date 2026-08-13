/**
 * Built-in SavedView presets (BP-038A).
 *
 * Architecture only — no UI. Each view lists Person catalog field ids only;
 * titles/types/capabilities resolve through `columnFromCatalog`.
 */

import type { Person } from "@/features/people/types";

import { columnsFromFieldIds } from "./columnFromCatalog";
import type { ColumnGroup, SavedView, SpreadsheetFieldId } from "./types";

function fieldIds(ids: readonly (keyof Person)[]): SpreadsheetFieldId[] {
  return [...ids];
}

function groups(
  entries: readonly { id: string; label: string; keys: readonly (keyof Person)[] }[],
): ColumnGroup[] {
  return entries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    fieldIds: fieldIds(entry.keys),
  }));
}

/** Team Roster — operational directory-style columns. */
export const ROSTER_VIEW: SavedView = {
  id: "people.roster",
  name: "Roster View",
  kind: "roster",
  moduleId: "people",
  description: "Default team roster columns for day-to-day coaching work.",
  isDefault: true,
  columns: columnsFromFieldIds(
    fieldIds([
      "lastName",
      "firstName",
      "preferredName",
      "statusId",
      "roleId",
      "playerStatus",
      "classYear",
      "major",
      "city",
      "state",
      "utr",
      "wtn",
      "cellPhone",
      "personalEmail",
      "denisonEmail",
    ]),
  ),
  columnGroups: groups([
    { id: "identity", label: "Identity", keys: ["lastName", "firstName", "preferredName"] },
    { id: "status", label: "Status", keys: ["statusId", "roleId", "playerStatus"] },
    { id: "denison", label: "Denison", keys: ["classYear", "major"] },
    { id: "tennis", label: "Tennis", keys: ["utr", "wtn"] },
    { id: "contact", label: "Contact", keys: ["cellPhone", "personalEmail", "denisonEmail"] },
  ]),
  sorts: [
    { fieldId: "lastName", direction: "asc" },
    { fieldId: "firstName", direction: "asc" },
  ],
};

/** Recruiting — prospect-oriented subset (Person fields only until Recruit domain exists). */
export const RECRUITING_VIEW: SavedView = {
  id: "people.recruiting",
  name: "Recruiting View",
  kind: "recruiting",
  moduleId: "people",
  description: "Recruiting-oriented Person columns (catalog-backed).",
  columns: columnsFromFieldIds(
    fieldIds([
      "lastName",
      "firstName",
      "preferredName",
      "classYear",
      "city",
      "state",
      "utr",
      "wtn",
      "dominantHand",
      "heightInches",
      "cellPhone",
      "personalEmail",
      "preferredContactMethod",
      "notes",
    ]),
  ),
  sorts: [{ fieldId: "utr", direction: "desc" }],
};

/** Travel Manifest — travel / identity columns for trip logistics. */
export const TRAVEL_MANIFEST_VIEW: SavedView = {
  id: "people.travel_manifest",
  name: "Travel Manifest",
  kind: "travel_manifest",
  moduleId: "people",
  description: "Travel document and air-travel columns for manifests.",
  columns: columnsFromFieldIds(
    fieldIds([
      "fullLegalName",
      "firstName",
      "middleName",
      "middleInitial",
      "lastName",
      "dateOfBirth",
      "passportNumber",
      "passportExpirationDate",
      "tsaKnownTravelerNumber",
      "seatPreference",
      "denisonEmail",
      "cellPhone",
    ]),
  ),
  columnGroups: groups([
    {
      id: "identity",
      label: "Identity",
      keys: ["fullLegalName", "firstName", "middleName", "middleInitial", "lastName", "dateOfBirth"],
    },
    {
      id: "documents",
      label: "Travel Documents",
      keys: ["passportNumber", "passportExpirationDate", "tsaKnownTravelerNumber"],
    },
    { id: "air", label: "Air Travel", keys: ["seatPreference"] },
  ]),
  sorts: [
    { fieldId: "lastName", direction: "asc" },
    { fieldId: "firstName", direction: "asc" },
  ],
};

/** Admissions — identity + Denison enrollment facts. */
export const ADMISSIONS_VIEW: SavedView = {
  id: "people.admissions",
  name: "Admissions View",
  kind: "admissions",
  moduleId: "people",
  description: "Admissions / enrollment-oriented Person columns.",
  columns: columnsFromFieldIds(
    fieldIds([
      "lastName",
      "firstName",
      "preferredName",
      "fullLegalName",
      "dateOfBirth",
      "classYear",
      "major",
      "minor",
      "denisonId",
      "statusId",
      "personalEmail",
      "denisonEmail",
      "addressLine1",
      "city",
      "state",
      "zipCode",
    ]),
  ),
  sorts: [{ fieldId: "classYear", direction: "asc" }],
};

/** Academics — standing / program of study (GPA later when modeled). */
export const ACADEMICS_VIEW: SavedView = {
  id: "people.academics",
  name: "Academics View",
  kind: "academics",
  moduleId: "people",
  description: "Academic program columns from the Person catalog.",
  columns: columnsFromFieldIds(
    fieldIds([
      "lastName",
      "firstName",
      "classYear",
      "major",
      "minor",
      "denisonId",
      "dorm",
      "roomNumber",
      "denisonEmail",
      "playerStatus",
      "notes",
    ]),
  ),
  sorts: [
    { fieldId: "classYear", direction: "asc" },
    { fieldId: "lastName", direction: "asc" },
  ],
};

/** All built-in Person spreadsheet views (no custom user views yet). */
export const PERSON_SAVED_VIEW_PRESETS: readonly SavedView[] = [
  ROSTER_VIEW,
  RECRUITING_VIEW,
  TRAVEL_MANIFEST_VIEW,
  ADMISSIONS_VIEW,
  ACADEMICS_VIEW,
];

export function getPersonSavedViewPreset(id: string): SavedView | undefined {
  return PERSON_SAVED_VIEW_PRESETS.find((view) => view.id === id);
}

export function listPersonSavedViewPresets(): readonly SavedView[] {
  return PERSON_SAVED_VIEW_PRESETS;
}

/**
 * Build a custom SavedView from catalog field ids (architecture helper).
 * Persistence / UI for custom views is a later milestone.
 */
export function createCustomPersonView(input: {
  id: string;
  name: string;
  fieldIds: readonly SpreadsheetFieldId[];
  description?: string;
}): SavedView {
  return {
    id: input.id,
    name: input.name,
    kind: "custom",
    moduleId: "people",
    description: input.description,
    columns: columnsFromFieldIds(input.fieldIds),
  };
}
