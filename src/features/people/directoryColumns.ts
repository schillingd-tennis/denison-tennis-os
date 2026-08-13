/**
 * Team directory view composition (BP-038B).
 *
 * Composite columns (Name / Role / Hometown) are directory-specific presentation.
 * Person field columns project titles, types, and export labels from the Field
 * Catalog via Spreadsheet ColumnDefinition — never a parallel field registry.
 */

import type { ColumnDef } from "@/components/data-table/types";
import type { FoundSetColumn } from "@/components/found-set";
import { getPersonColumnDefinition } from "@/features/spreadsheet-engine";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";

import type { Person } from "./types";
import {
  getDisplayFirstName,
  getDisplayName,
  getHometown,
  getPersonRoleDisplay,
} from "./utils";

/** Column ids used by Team List sorting / inline edit. */
export type TeamDirectoryColumnId =
  | "name"
  | "role"
  | "hometown"
  | "classYear"
  | "utr"
  | "wtn";

type CompositeDirectoryColumn = {
  kind: "composite";
  id: "name" | "role" | "hometown";
  title: string;
};

type CatalogDirectoryColumn = {
  kind: "field";
  /** Person catalog key (must exist in Field Catalog). */
  fieldId: "classYear" | "utr" | "wtn";
  /** Directory header override (view presentation only). */
  titleOverride?: string;
};

export type TeamDirectoryColumnSpec = CompositeDirectoryColumn | CatalogDirectoryColumn;

/**
 * Team List / Found Set column composition.
 * Field metadata for `kind: "field"` resolves from the catalog.
 */
export const TEAM_DIRECTORY_COLUMN_COMPOSITION: readonly TeamDirectoryColumnSpec[] = [
  { kind: "composite", id: "name", title: "Name" },
  { kind: "composite", id: "role", title: "Role" },
  { kind: "composite", id: "hometown", title: "Hometown" },
  { kind: "field", fieldId: "classYear", titleOverride: "Class" },
  { kind: "field", fieldId: "utr" },
  { kind: "field", fieldId: "wtn" },
];

function nameSortKey(person: Person): string {
  const last = person.lastName?.trim() || "";
  const first = getDisplayFirstName(person).trim();
  return `${last}\u0000${first}`;
}

function catalogColumnTitle(spec: CatalogDirectoryColumn): string {
  const column = getPersonColumnDefinition(spec.fieldId);
  if (!column) {
    throw new Error(`Team directory references unknown catalog field: ${spec.fieldId}`);
  }
  return spec.titleOverride ?? column.title;
}

function catalogSortType(fieldId: CatalogDirectoryColumn["fieldId"]): "number" | "text" {
  const column = getPersonColumnDefinition(fieldId);
  if (column?.dataType === "number" || column?.dataType === "currency" || column?.dataType === "percentage") {
    return "number";
  }
  return "text";
}

function catalogAlign(fieldId: CatalogDirectoryColumn["fieldId"]): "left" | "right" | undefined {
  const column = getPersonColumnDefinition(fieldId);
  if (column?.defaultAlign === "right") return "right";
  if (column?.defaultAlign === "left") return "left";
  return undefined;
}

function catalogFieldAccessor(fieldId: CatalogDirectoryColumn["fieldId"]): (person: Person) => unknown {
  return (person) => person[fieldId];
}

function catalogExportValue(person: Person, fieldId: CatalogDirectoryColumn["fieldId"]): string {
  const column = getPersonColumnDefinition(fieldId);
  if (!column) return EMPTY_VALUE;

  if (fieldId === "utr") return formatUtr(person.utr);
  if (fieldId === "wtn") return formatWtn(person.wtn);
  return formatDisplay(person[fieldId] as string | number | null | undefined);
}

function catalogExportTitle(spec: CatalogDirectoryColumn): string {
  const column = getPersonColumnDefinition(spec.fieldId);
  if (!column) {
    throw new Error(`Team directory references unknown catalog field: ${spec.fieldId}`);
  }
  // Found-set headers match the visible directory titles (not csvLabel).
  return spec.titleOverride ?? column.title;
}

/** Data-table ColumnDefs for Team List (sort metadata from catalog where applicable). */
export function buildTeamDirectoryTableColumns(): ColumnDef<Person, TeamDirectoryColumnId>[] {
  return TEAM_DIRECTORY_COLUMN_COMPOSITION.map((spec): ColumnDef<Person, TeamDirectoryColumnId> => {
    if (spec.kind === "composite") {
      switch (spec.id) {
        case "name":
          return {
            id: "name",
            title: spec.title,
            sortable: true,
            sortType: "text",
            accessor: nameSortKey,
            defaultSort: "asc",
          };
        case "role":
          return {
            id: "role",
            title: spec.title,
            sortable: true,
            sortType: "text",
            accessor: (person) => getPersonRoleDisplay(person),
            defaultSort: "asc",
          };
        case "hometown":
          return {
            id: "hometown",
            title: spec.title,
            sortable: true,
            sortType: "text",
            accessor: (person) => getHometown(person),
            defaultSort: "asc",
          };
      }
    }

    const align = catalogAlign(spec.fieldId);
    return {
      id: spec.fieldId,
      title: catalogColumnTitle(spec),
      sortable: getPersonColumnDefinition(spec.fieldId)?.sortable ?? true,
      sortType: catalogSortType(spec.fieldId),
      align,
      accessor: catalogFieldAccessor(spec.fieldId),
      defaultSort: spec.fieldId === "classYear" ? "asc" : "desc",
    };
  });
}

/** Found-set / CSV columns — Person fields use catalog titles; values use shared formatters. */
export function buildTeamFoundSetColumns(): FoundSetColumn<Person>[] {
  return TEAM_DIRECTORY_COLUMN_COMPOSITION.map((spec): FoundSetColumn<Person> => {
    if (spec.kind === "composite") {
      switch (spec.id) {
        case "name":
          return {
            id: "name",
            title: spec.title,
            accessor: (person) => getDisplayName(person),
          };
        case "role":
          return {
            id: "role",
            title: spec.title,
            accessor: (person) => getPersonRoleDisplay(person),
          };
        case "hometown":
          return {
            id: "hometown",
            title: spec.title,
            accessor: (person) => formatDisplay(getHometown(person)),
          };
      }
    }

    return {
      id: spec.fieldId,
      title: catalogExportTitle(spec),
      accessor: (person) => catalogExportValue(person, spec.fieldId),
    };
  });
}

/** Prebuilt table columns (stable reference for PersonList). */
export const TEAM_DIRECTORY_TABLE_COLUMNS = buildTeamDirectoryTableColumns();

/** Prebuilt found-set columns (stable reference for publish / export). */
export const TEAM_FOUND_SET_COLUMNS = buildTeamFoundSetColumns();
