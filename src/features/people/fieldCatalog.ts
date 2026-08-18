/**
 * Centralized Person field catalog (BP-036A / BP-036E / BP-037 / BP-038B).
 *
 * Single registration point for Person field metadata. Spreadsheet views,
 * column pickers, CSV export builders, Adaptive Workspaces, filters, search,
 * AI, forms, and the Universal Field Engine must consume this catalog — never
 * redefine Person fields.
 *
 * Shape of record values: `types.ts`. Persistence: `supabaseMapping.ts`
 * (row↔domain coercion). Rendering / edit: `src/features/field-engine`.
 */

import type { FieldType } from "@/features/field-engine/types";

import type { Person, SeatPreference } from "./types";

/** Catalog field types — Universal Field Engine types. */
export type PersonFieldType = FieldType;

/**
 * Canonical Person sections. `personal` holds biographical facts (DOB).
 * `travel` holds travel-identity fields that live on Person once.
 */
export type PersonFieldSection =
  | "system"
  | "identity"
  | "personal"
  | "contact"
  | "permanentAddress"
  | "denison"
  | "school"
  | "tennis"
  | "travel"
  | "relationships"
  | "notes";

/** Adaptive Workspace ids that may include a field (membership, not layout). */
export type PersonWorkspaceId = "travel" | "contact" | "family";

/**
 * Grouping within a workspace. Titles/layout live in the workspace component;
 * membership + order come from the catalog.
 */
export type PersonWorkspaceGroupId =
  | "travel.identity"
  | "travel.documents"
  | "travel.air"
  | "travel.government"
  | "contact.email"
  | "contact.phone"
  | "contact.preferences"
  | "contact.notes"
  | "family.notes";

export type PersonFieldEnumOption<T extends string = string> = {
  value: T;
  label: string;
};

export type PersonFieldDefinition = {
  key: keyof Person;
  label: string;
  section: PersonFieldSection;
  type: PersonFieldType;
  /** When true, keep out of directory / casual list surfaces (ARCHITECTURE §15). */
  sensitive?: boolean;
  required?: boolean;
  editable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  /**
   * When true, directory / palette / spreadsheet search may index this field.
   * Omitted → not searchable (opt-in capability, BP-038B).
   */
  searchable?: boolean;
  /** CSV / export header; defaults to `label` when omitted (BP-038A). */
  csvLabel?: string;
  /** Preferred spreadsheet column width in px (BP-038A). */
  defaultWidth?: number;
  /** Preferred spreadsheet cell alignment (BP-038A). */
  defaultAlign?: "left" | "right" | "center";
  /** Preferred max length for text (e.g. middle initial = 1). */
  maxLength?: number;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
  /** Stable enum options; value is what persists. */
  enumValues?: readonly PersonFieldEnumOption[];
  /** Postgres column on `production_people` when persisted 1:1. */
  dbColumn?: string;
  description?: string;
  /**
   * Adaptive Workspaces that include this field (BP-038B).
   * View layout/titles stay in the workspace; membership is catalog-driven.
   */
  workspaces?: readonly PersonWorkspaceId[];
  /** Group within a workspace (with `workspaces`). */
  workspaceGroup?: PersonWorkspaceGroupId;
  /** Order within `workspaceGroup` (lower first). */
  workspaceOrder?: number;
};

export const SEAT_PREFERENCE_OPTIONS = [
  { value: "window", label: "Window" },
  { value: "aisle", label: "Aisle" },
  { value: "middle", label: "Middle" },
  { value: "exit_row", label: "Exit Row" },
  { value: "bulkhead", label: "Bulkhead" },
  { value: "no_preference", label: "No Preference" },
] as const satisfies readonly PersonFieldEnumOption<SeatPreference>[];

export const SEAT_PREFERENCE_VALUES = SEAT_PREFERENCE_OPTIONS.map((o) => o.value);

/**
 * Canonical Person field registry. Order within a section is the preferred
 * display / column-picker order for that section.
 */
export const PERSON_FIELD_CATALOG: readonly PersonFieldDefinition[] = [
  // System
  {
    key: "id",
    label: "ID",
    section: "system",
    type: "system",
    editable: false,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "id",
  },
  {
    key: "createdAt",
    label: "Created",
    section: "system",
    type: "system",
    editable: false,
    sortable: true,
    exportable: true,
    dbColumn: "created_at",
  },
  {
    key: "updatedAt",
    label: "Updated",
    section: "system",
    type: "system",
    editable: false,
    sortable: true,
    exportable: true,
    dbColumn: "updated_at",
  },

  // Identity
  {
    key: "roleId",
    label: "Role",
    section: "identity",
    type: "relationship",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "role_id",
  },
  {
    key: "statusId",
    label: "Status",
    section: "identity",
    type: "relationship",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "status_id",
  },
  {
    key: "role",
    label: "Role",
    section: "identity",
    type: "relationship",
    editable: false,
    searchable: true,
    description: "Joined role lookup; not a writable column.",
  },
  {
    key: "status",
    label: "Status",
    section: "identity",
    type: "relationship",
    editable: false,
    searchable: true,
    description: "Joined status lookup; not a writable column.",
  },
  {
    key: "title",
    label: "Title",
    section: "identity",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "title",
  },
  {
    key: "fullLegalName",
    label: "Full Legal Name",
    section: "identity",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "full_legal_name",
    workspaces: ["travel"],
    workspaceGroup: "travel.identity",
    workspaceOrder: 100,
  },
  {
    key: "firstName",
    label: "First Name",
    section: "identity",
    type: "text",
    required: true,
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "first_name",
  },
  {
    key: "middleName",
    label: "Middle Name",
    section: "identity",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "middle_name",
    workspaces: ["travel"],
    workspaceGroup: "travel.identity",
    workspaceOrder: 110,
  },
  {
    key: "middleInitial",
    label: "Middle Initial",
    section: "identity",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    maxLength: 1,
    dbColumn: "middle_initial",
    workspaces: ["travel"],
    workspaceGroup: "travel.identity",
    workspaceOrder: 120,
  },
  {
    key: "lastName",
    label: "Last Name",
    section: "identity",
    type: "text",
    required: true,
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "last_name",
  },
  {
    key: "preferredName",
    label: "Preferred Name",
    section: "identity",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "preferred_name",
  },
  {
    key: "photoUrl",
    label: "Photo",
    section: "identity",
    type: "url",
    editable: true,
    exportable: true,
    dbColumn: "photo_url",
  },

  // Personal Information
  {
    key: "dateOfBirth",
    label: "Date of Birth",
    section: "personal",
    type: "date",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "date_of_birth",
    description: "Canonical Personal Information field; do not duplicate elsewhere.",
    workspaces: ["travel"],
    workspaceGroup: "travel.identity",
    workspaceOrder: 130,
  },

  // Contact
  {
    key: "personalEmail",
    label: "Personal Email",
    section: "contact",
    type: "email",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "personal_email",
    workspaces: ["contact"],
    workspaceGroup: "contact.email",
    workspaceOrder: 10,
  },
  {
    key: "denisonEmail",
    label: "Denison Email",
    section: "contact",
    type: "email",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "denison_email",
    workspaces: ["contact"],
    workspaceGroup: "contact.email",
    workspaceOrder: 20,
  },
  {
    key: "cellPhone",
    label: "Mobile Phone",
    section: "contact",
    type: "phone",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "cell_phone",
    workspaces: ["contact"],
    workspaceGroup: "contact.phone",
    workspaceOrder: 10,
  },
  {
    key: "preferredContactMethod",
    label: "Preferred Contact Method",
    section: "contact",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "preferred_contact_method",
    enumValues: [
      { value: "phone", label: "Phone" },
      { value: "text", label: "Text" },
      { value: "email", label: "Email" },
    ],
    workspaces: ["contact"],
    workspaceGroup: "contact.preferences",
    workspaceOrder: 10,
  },

  // Permanent Address
  {
    key: "addressLine1",
    label: "Address Line 1",
    section: "permanentAddress",
    type: "text",
    editable: true,
    exportable: true,
    dbColumn: "address_line1",
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    section: "permanentAddress",
    type: "text",
    editable: true,
    exportable: true,
    dbColumn: "address_line2",
  },
  {
    key: "city",
    label: "City",
    section: "permanentAddress",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "city",
  },
  {
    key: "state",
    label: "State",
    section: "permanentAddress",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "state",
  },
  {
    key: "zipCode",
    label: "ZIP Code",
    section: "permanentAddress",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "zip_code",
  },
  {
    key: "country",
    label: "Country",
    section: "permanentAddress",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "country",
  },

  // Denison Information
  {
    key: "classYear",
    label: "Class Year",
    section: "denison",
    type: "number",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "class_year",
    description:
      "Denison college graduation year. High-school recruiting class lives on RecruitProfile.recruitClassYear (BP-043E).",
  },
  {
    key: "major",
    label: "Major",
    section: "denison",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "major",
  },
  {
    key: "minor",
    label: "Minor",
    section: "denison",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "minor",
  },
  {
    key: "denisonId",
    label: "Denison ID",
    section: "denison",
    type: "text",
    sensitive: true,
    editable: true,
    exportable: true,
    searchable: true,
    dbColumn: "denison_id",
  },
  {
    key: "dorm",
    label: "Dorm",
    section: "denison",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "dorm",
  },
  {
    key: "roomNumber",
    label: "Room Number",
    section: "denison",
    type: "text",
    editable: true,
    exportable: true,
    dbColumn: "room_number",
  },

  // School (origin HS; not Denison campus fields)
  {
    key: "highSchool",
    label: "High School",
    section: "school",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    searchable: true,
    dbColumn: "high_school",
    description: "Origin high school. Lives on Person for all roles (BP-043C).",
  },

  // Tennis Information
  {
    key: "utr",
    label: "UTR",
    section: "tennis",
    type: "number",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "utr",
  },
  {
    key: "wtn",
    label: "WTN",
    section: "tennis",
    type: "number",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "wtn",
  },
  {
    key: "trnRank",
    label: "TRN Rank",
    section: "tennis",
    type: "number",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "trn_rank",
    description:
      "Raw TennisRecruiting.net ranking (lower is better). Not calculated TR Rank (BP-043C).",
  },
  {
    key: "trnStarRating",
    label: "TR Star Rating",
    section: "tennis",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "trn_star_rating",
    enumValues: [
      { value: "1", label: "1 Star" },
      { value: "2", label: "2 Star" },
      { value: "3", label: "3 Star" },
      { value: "4", label: "4 Star" },
      { value: "5", label: "5 Star" },
      { value: "6", label: "Blue Chip" },
    ] as const satisfies readonly PersonFieldEnumOption[],
  },
  {
    key: "trnUrl",
    label: "TRN URL",
    section: "tennis",
    type: "url",
    editable: true,
    exportable: true,
    dbColumn: "trn_url",
  },
  {
    key: "utrUrl",
    label: "UTR URL",
    section: "tennis",
    type: "url",
    editable: true,
    exportable: true,
    dbColumn: "utr_url",
  },
  {
    key: "wtnUrl",
    label: "WTN URL",
    section: "tennis",
    type: "url",
    editable: true,
    exportable: true,
    dbColumn: "wtn_url",
  },
  {
    key: "utrMatchesPlayed",
    label: "Matches Played",
    section: "tennis",
    type: "number",
    editable: true,
    sortable: true,
    exportable: true,
    dbColumn: "utr_matches_played",
    description: "UTR match volume. Analytics input later; not Reliability.",
  },
  {
    key: "videoUrl",
    label: "Video URL",
    section: "tennis",
    type: "url",
    editable: true,
    exportable: true,
    dbColumn: "video_url",
  },
  {
    key: "dominantHand",
    label: "Dominant Hand",
    section: "tennis",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "dominant_hand",
    enumValues: [
      { value: "right", label: "Right" },
      { value: "left", label: "Left" },
    ],
  },
  {
    key: "heightInches",
    label: "Height (inches)",
    section: "tennis",
    type: "number",
    editable: true,
    sortable: true,
    exportable: true,
    dbColumn: "height_inches",
  },
  {
    key: "weightLbs",
    label: "Weight (lbs)",
    section: "tennis",
    type: "number",
    editable: true,
    sortable: true,
    exportable: true,
    dbColumn: "weight_lbs",
  },
  {
    key: "playerStatus",
    label: "Player Status",
    section: "tennis",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "player_status",
    enumValues: [
      { value: "active", label: "Active" },
      { value: "injured", label: "Injured" },
      { value: "inactive", label: "Inactive" },
      { value: "graduated", label: "Graduated" },
    ],
  },

  // Travel (BP-036A / BP-036E)
  {
    key: "socialSecurityNumber",
    label: "Social Security Number",
    section: "travel",
    type: "secureText",
    sensitive: true,
    editable: true,
    exportable: false,
    dbColumn: "social_security_number",
    workspaces: ["travel"],
    workspaceGroup: "travel.government",
    workspaceOrder: 400,
  },
  {
    key: "tsaKnownTravelerNumber",
    label: "TSA Known Traveler Number",
    section: "travel",
    type: "text",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "tsa_known_traveler_number",
    workspaces: ["travel"],
    workspaceGroup: "travel.documents",
    workspaceOrder: 220,
  },
  {
    key: "passportNumber",
    label: "Passport Number",
    section: "travel",
    type: "secureText",
    sensitive: true,
    editable: true,
    exportable: false,
    dbColumn: "passport_number",
    workspaces: ["travel"],
    workspaceGroup: "travel.documents",
    workspaceOrder: 200,
  },
  {
    key: "passportExpirationDate",
    label: "Passport Expiration Date",
    section: "travel",
    type: "date",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "passport_expiration_date",
    workspaces: ["travel"],
    workspaceGroup: "travel.documents",
    workspaceOrder: 210,
  },
  {
    key: "seatPreference",
    label: "Seat Preference",
    section: "travel",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "seat_preference",
    enumValues: SEAT_PREFERENCE_OPTIONS,
    workspaces: ["travel"],
    workspaceGroup: "travel.air",
    workspaceOrder: 300,
  },

  // Relationships
  {
    key: "relationships",
    label: "Relationships",
    section: "relationships",
    type: "json",
    editable: false,
    exportable: false,
    dbColumn: "relationships",
  },

  // Notes — Person.notes; Contact workspace shows for Family Persons (view filters).
  {
    key: "notes",
    label: "Notes",
    section: "notes",
    type: "longText",
    editable: true,
    exportable: true,
    dbColumn: "notes",
    workspaces: ["contact"],
    workspaceGroup: "contact.notes",
    workspaceOrder: 10,
  },

  // Player Family Notes — family-context notes on the Player (not parent Person.notes).
  {
    key: "familyNotes",
    label: "Notes",
    section: "notes",
    type: "longText",
    editable: true,
    exportable: true,
    dbColumn: "family_notes",
    placeholder: "No family notes yet",
    description:
      "Family-context notes for this player (siblings, dynamics, recruiting observations).",
    workspaces: ["family"],
    workspaceGroup: "family.notes",
    workspaceOrder: 10,
  },
] as const;

const catalogByKey = new Map<keyof Person, PersonFieldDefinition>(
  PERSON_FIELD_CATALOG.map((field) => [field.key, field]),
);

/** Look up a Person field definition by domain key. */
export function getPersonField(key: keyof Person): PersonFieldDefinition | undefined {
  return catalogByKey.get(key);
}

/** Alias — canonical getter used by downstream systems (BP-038B). */
export const getField = getPersonField;

/** Every Person field definition (catalog order). */
export function getPersonFields(): readonly PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG;
}

/** Alias for `getPersonFields`. */
export const getFields = getPersonFields;

/** All field definitions in a section, in catalog order. */
export function getPersonFieldsBySection(section: PersonFieldSection): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter((field) => field.section === section);
}

/** Fields marked sensitive (directory / casual list exclusion). */
export function getSensitivePersonFields(): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter((field) => field.sensitive === true);
}

/** Whether a field is searchable (explicit opt-in; omitted → false). */
export function isPersonFieldSearchable(def: PersonFieldDefinition): boolean {
  return def.searchable === true;
}

export function getSearchablePersonFields(): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter(isPersonFieldSearchable);
}

export function getFilterablePersonFields(): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter((field) => field.filterable === true);
}

export function getSortablePersonFields(): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter((field) => field.sortable === true);
}

export function getExportablePersonFields(): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter((field) => field.exportable === true);
}

/**
 * Fields eligible for spreadsheet / column pickers (not system/json-only noise).
 * Capability flags still gate sort/filter/export per column.
 */
export function getSpreadsheetPersonFields(): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter(
    (field) =>
      field.type !== "system" &&
      field.type !== "json" &&
      field.key !== "role" &&
      field.key !== "status",
  );
}

export type PersonFieldScope =
  | { kind: "section"; section: PersonFieldSection }
  | { kind: "workspace"; workspace: PersonWorkspaceId; group?: PersonWorkspaceGroupId }
  | { kind: "searchable" }
  | { kind: "filterable" }
  | { kind: "sortable" }
  | { kind: "exportable" }
  | { kind: "spreadsheet" }
  | { kind: "sensitive" }
  | { kind: "dbColumn" };

/** Scope-based field selection (BP-038B). */
export function getPersonFieldsForScope(scope: PersonFieldScope): PersonFieldDefinition[] {
  switch (scope.kind) {
    case "section":
      return getPersonFieldsBySection(scope.section);
    case "workspace":
      return getPersonFieldsForWorkspace(scope.workspace, scope.group);
    case "searchable":
      return getSearchablePersonFields();
    case "filterable":
      return getFilterablePersonFields();
    case "sortable":
      return getSortablePersonFields();
    case "exportable":
      return getExportablePersonFields();
    case "spreadsheet":
      return getSpreadsheetPersonFields();
    case "sensitive":
      return getSensitivePersonFields();
    case "dbColumn":
      return getPersonFieldsWithDbColumn();
    default:
      return [];
  }
}

/** Fields included in an Adaptive Workspace, ordered by workspaceOrder then catalog. */
export function getPersonFieldsForWorkspace(
  workspace: PersonWorkspaceId,
  group?: PersonWorkspaceGroupId,
): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter(
    (field) =>
      field.workspaces?.includes(workspace) &&
      (group === undefined || field.workspaceGroup === group),
  ).sort((a, b) => (a.workspaceOrder ?? 0) - (b.workspaceOrder ?? 0));
}

export function getPersonFieldKeysForWorkspace(
  workspace: PersonWorkspaceId,
): (keyof Person)[] {
  return getPersonFieldsForWorkspace(workspace).map((field) => field.key);
}

/** Catalog entries that map 1:1 to a Postgres column. */
export function getPersonFieldsWithDbColumn(): PersonFieldDefinition[] {
  return PERSON_FIELD_CATALOG.filter((field) => Boolean(field.dbColumn));
}

/** Postgres column names in catalog order (including system id/timestamps). */
export function listPersonDbColumns(): string[] {
  return getPersonFieldsWithDbColumn().map((field) => field.dbColumn as string);
}

/**
 * Profile columns eligible for seed/import fill-null (excludes id / timestamps).
 * Derived from catalog `dbColumn` — do not maintain a parallel list.
 */
export function listImportedOnceDbColumns(): string[] {
  return getPersonFieldsWithDbColumn()
    .filter(
      (field) =>
        field.key !== "id" && field.key !== "createdAt" && field.key !== "updatedAt",
    )
    .map((field) => field.dbColumn as string);
}

/**
 * Domain key → Postgres column for writable Person patches.
 * Excludes joined `role` / `status` (no dbColumn) and includes all other db columns
 * except pure system timestamps are still mapped for completeness of personToRow.
 */
export function getWritablePersonFieldMap(): Partial<Record<keyof Person, string>> {
  const map: Partial<Record<keyof Person, string>> = {};
  for (const field of getPersonFieldsWithDbColumn()) {
    if (field.key === "id" || field.key === "createdAt" || field.key === "updatedAt") {
      continue;
    }
    map[field.key] = field.dbColumn;
  }
  return map;
}

/** Aliases matching the BP-038B selector naming. */
export const getSearchableFields = getSearchablePersonFields;
export const getFilterableFields = getFilterablePersonFields;
export const getSortableFields = getSortablePersonFields;
export const getExportableFields = getExportablePersonFields;
export const getSpreadsheetFields = getSpreadsheetPersonFields;
export const getFieldsForScope = getPersonFieldsForScope;
