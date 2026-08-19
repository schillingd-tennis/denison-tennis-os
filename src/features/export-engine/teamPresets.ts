/**
 * Team / Person export presets.
 *
 * Field ids come from the Person catalog (plus computed Player Name / Hometown).
 * Isolated from the generic engine so Recruiting can register its own presets.
 */

import { getPersonFieldKeysForWorkspace } from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";
import { TEAM_FOUND_SET_FILENAME_BASE } from "@/features/people/foundSet";

import {
  exportableCatalogKeys,
  HOMETOWN_FIELD_ID,
  listPersonExportFields,
  PLAYER_NAME_FIELD_ID,
} from "./personFields";
import type { ExportModuleDefinition, ExportPreset } from "./types";

const PLAYER_NAME = PLAYER_NAME_FIELD_ID;

const PERSONAL_INFO_KEYS = [
  "statusId",
  "roleId",
  "firstName",
  "lastName",
  "denisonId",
  "highSchool",
  "dateOfBirth",
  "personalEmail",
  "denisonEmail",
  "cellPhone",
  "addressLine1",
  "city",
  "state",
  "zipCode",
  "country",
  "notes",
] as const satisfies readonly (keyof Person)[];

const DIRECTORY_KEYS = [
  "roleId",
  "classYear",
  "utr",
  "wtn",
  "cellPhone",
  "personalEmail",
  "denisonEmail",
] as const satisfies readonly (keyof Person)[];

const ACADEMICS_KEYS = [
  "major",
  "minor",
  "gpa",
  "gpaLastSemester",
  "gpaLastYear",
] as const satisfies readonly (keyof Person)[];

const EQUIPMENT_KEYS = [
  "tShirtSize",
  "driFitSize",
  "collaredShirtSize",
  "longSleeveSize",
  "jacketSize",
  "hoodieSize",
  "shortsSize",
  "pantsSize",
  "shoeSize",
  "racket",
  "gripSize",
  "string",
] as const satisfies readonly (keyof Person)[];

function withPlayerName(ids: readonly string[]): string[] {
  return [PLAYER_NAME, ...ids.filter((id) => id !== PLAYER_NAME)];
}

export const TEAM_EXPORT_PRESETS: readonly ExportPreset[] = [
  {
    id: "playerDirectory",
    label: "Player Directory",
    fieldIds: withPlayerName([HOMETOWN_FIELD_ID, ...exportableCatalogKeys(DIRECTORY_KEYS)]),
  },
  {
    id: "personalInfo",
    label: "Personal Info",
    fieldIds: withPlayerName(exportableCatalogKeys(PERSONAL_INFO_KEYS)),
  },
  {
    id: "academics",
    label: "Academics",
    fieldIds: withPlayerName(exportableCatalogKeys(ACADEMICS_KEYS)),
  },
  {
    id: "equipment",
    label: "Equipment",
    fieldIds: withPlayerName(exportableCatalogKeys(EQUIPMENT_KEYS)),
  },
  {
    id: "travel",
    label: "Travel",
    fieldIds: withPlayerName(exportableCatalogKeys(getPersonFieldKeysForWorkspace("travel"))),
  },
  {
    id: "custom",
    label: "Custom",
    fieldIds: [],
    custom: true,
  },
];

export const TEAM_EXPORT_MODULE: ExportModuleDefinition<Person> = {
  moduleId: "team",
  filenameBase: TEAM_FOUND_SET_FILENAME_BASE,
  fields: listPersonExportFields(),
  presets: TEAM_EXPORT_PRESETS,
  defaultFieldIds: [PLAYER_NAME],
};

export function getTeamExportPreset(id: string): ExportPreset | undefined {
  return TEAM_EXPORT_PRESETS.find((preset) => preset.id === id);
}
