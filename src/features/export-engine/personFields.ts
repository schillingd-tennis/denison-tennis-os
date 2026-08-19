/**
 * Person → export field projection.
 *
 * Catalog metadata (label, type, exportable, enums) is the source of truth.
 * Computed fields (Player Name, Hometown) are registered here — they are not
 * Person columns and must not be duplicated in the data model.
 */

import {
  getExportablePersonFields,
  getPersonField,
  type PersonFieldDefinition,
  type PersonFieldType,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";
import {
  getDisplayName,
  getHometown,
  getPersonRoleDisplay,
  getStatusLabel,
} from "@/features/people/utils";

import type { ExportCellValue, ExportFieldDefinition, ExportValueType } from "./types";

const SECTION_GROUP_LABEL: Record<string, string> = {
  system: "System",
  identity: "Identity",
  personal: "Personal",
  contact: "Contact",
  permanentAddress: "Address",
  denison: "Academics",
  school: "School",
  tennis: "Tennis",
  travel: "Travel",
  equipment: "Equipment",
  relationships: "Relationships",
  notes: "Notes",
};

export function exportGroupLabel(group: string): string {
  return SECTION_GROUP_LABEL[group] ?? group;
}

function mapValueType(type: PersonFieldType): ExportValueType {
  switch (type) {
    case "number":
    case "currency":
    case "percentage":
      return "number";
    case "date":
      return "date";
    case "enum":
    case "boolean":
      return type;
    default:
      return "text";
  }
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

function catalogValue(person: Person, def: PersonFieldDefinition): ExportCellValue {
  if (def.key === "roleId") {
    const label = getPersonRoleDisplay(person).trim();
    return label || null;
  }
  if (def.key === "statusId") {
    const label = getStatusLabel(person).trim();
    return label || null;
  }

  const raw = person[def.key];
  if (raw === undefined || raw === null || raw === "") return null;

  if (def.type === "number" || def.type === "currency" || def.type === "percentage") {
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  }

  if (def.type === "date") {
    return isoDate(raw);
  }

  if (def.type === "boolean") {
    const value: unknown = raw;
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return null;
  }

  if (def.type === "enum") {
    const asString = String(raw);
    return def.enumValues?.find((option) => option.value === asString)?.label ?? asString;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed === "" ? null : trimmed;
  }

  return String(raw);
}

function catalogToExportField(def: PersonFieldDefinition): ExportFieldDefinition<Person> {
  return {
    id: def.key,
    label: def.csvLabel ?? def.label,
    group: def.section,
    type: mapValueType(def.type),
    getValue: (person) => catalogValue(person, def),
  };
}

export const PLAYER_NAME_FIELD_ID = "playerName";
export const HOMETOWN_FIELD_ID = "hometown";

export const PLAYER_NAME_FIELD: ExportFieldDefinition<Person> = {
  id: PLAYER_NAME_FIELD_ID,
  label: "Player Name",
  group: "identity",
  type: "text",
  getValue: (person) => {
    const name = getDisplayName(person).trim();
    return name || null;
  },
};

export const HOMETOWN_FIELD: ExportFieldDefinition<Person> = {
  id: HOMETOWN_FIELD_ID,
  label: "Hometown",
  group: "permanentAddress",
  type: "text",
  getValue: (person) => getHometown(person)?.trim() || null,
};

/**
 * Every Person field available to the Export Builder: computed Team helpers
 * plus catalog fields marked exportable.
 */
export function listPersonExportFields(): ExportFieldDefinition<Person>[] {
  const computed = [PLAYER_NAME_FIELD, HOMETOWN_FIELD];
  const catalog = getExportablePersonFields()
    .filter((field) => field.type !== "json")
    .map(catalogToExportField);
  return [...computed, ...catalog];
}

export function personExportFieldIds(
  keys: readonly (keyof Person | typeof PLAYER_NAME_FIELD_ID | typeof HOMETOWN_FIELD_ID)[],
): string[] {
  return keys.map((key) => String(key));
}

/** Drop catalog keys that are not exportable (e.g. passport number). */
export function exportableCatalogKeys(keys: readonly (keyof Person)[]): string[] {
  return keys.filter((key) => getPersonField(key)?.exportable === true);
}
