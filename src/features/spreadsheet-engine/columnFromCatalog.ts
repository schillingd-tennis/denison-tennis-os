/**
 * Person Field Catalog → Spreadsheet ColumnDefinition bridge (BP-038A).
 *
 * Single source of truth: `PERSON_FIELD_CATALOG`. This module never invents
 * field labels, types, or capabilities — it only projects catalog metadata
 * into spreadsheet-engine shapes.
 */

import {
  getPersonField,
  getSpreadsheetPersonFields,
  isPersonFieldSearchable,
  PERSON_FIELD_CATALOG,
  type PersonFieldDefinition,
  type PersonFieldType as FieldType,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

import type {
  ColumnAlign,
  ColumnDefinition,
  SpreadsheetColumn,
  SpreadsheetEditorKind,
  SpreadsheetFieldId,
  SpreadsheetFormatterKind,
  SpreadsheetView,
  SavedView,
} from "./types";

function formatterForType(type: FieldType): SpreadsheetFormatterKind {
  switch (type) {
    case "text":
    case "longText":
    case "date":
    case "number":
    case "boolean":
    case "enum":
    case "phone":
    case "email":
    case "url":
    case "currency":
    case "percentage":
    case "relationship":
    case "secureText":
    case "system":
    case "json":
      return type;
    case "attachment":
      return "text";
    default:
      return "text";
  }
}

function editorForType(type: FieldType, editable: boolean): SpreadsheetEditorKind {
  if (!editable || type === "system" || type === "json" || type === "attachment") {
    return "readonly";
  }
  switch (type) {
    case "longText":
      return "textarea";
    case "date":
      return "date";
    case "number":
    case "currency":
    case "percentage":
      return "number";
    case "enum":
      return "select";
    case "boolean":
      return "checkbox";
    case "phone":
      return "tel";
    case "email":
      return "email";
    case "url":
      return "url";
    case "text":
    case "secureText":
    case "relationship":
    default:
      return "text";
  }
}

function defaultWidthFor(def: PersonFieldDefinition): number {
  if (def.defaultWidth !== undefined) return def.defaultWidth;
  switch (def.type) {
    case "longText":
      return 280;
    case "date":
      return 120;
    case "number":
    case "currency":
    case "percentage":
      return 96;
    case "boolean":
      return 80;
    case "enum":
      return 140;
    case "secureText":
      return 160;
    case "email":
    case "url":
      return 200;
    case "phone":
      return 140;
    default:
      return 160;
  }
}

function defaultAlignFor(def: PersonFieldDefinition): ColumnAlign {
  if (def.defaultAlign) return def.defaultAlign;
  switch (def.type) {
    case "number":
    case "currency":
    case "percentage":
      return "right";
    case "boolean":
      return "center";
    default:
      return "left";
  }
}

function isEditable(def: PersonFieldDefinition): boolean {
  if (def.type === "system" || def.type === "json" || def.type === "attachment") return false;
  return def.editable !== false;
}

/** Project one Person catalog field into a ColumnDefinition. */
export function personFieldToColumnDefinition(def: PersonFieldDefinition): ColumnDefinition {
  const editable = isEditable(def);
  return {
    fieldId: def.key,
    title: def.label,
    dataType: def.type,
    formatter: formatterForType(def.type),
    editor: editorForType(def.type, editable),
    csvLabel: def.csvLabel ?? def.label,
    searchable: isPersonFieldSearchable(def),
    sortable: def.sortable === true,
    filterable: def.filterable === true,
    exportable: def.exportable === true,
    sensitive: def.sensitive === true,
    editable,
    defaultWidth: defaultWidthFor(def),
    defaultAlign: defaultAlignFor(def),
    enumValues: def.enumValues?.map((option) => ({
      value: option.value,
      label: option.label,
    })),
    section: def.section,
  };
}

/** Resolve a Person catalog key to a ColumnDefinition, or undefined if unknown. */
export function getPersonColumnDefinition(
  fieldId: SpreadsheetFieldId,
): ColumnDefinition | undefined {
  const def = getPersonField(fieldId as keyof Person);
  return def ? personFieldToColumnDefinition(def) : undefined;
}

/** Every Person catalog field as a ColumnDefinition (catalog order). */
export function listPersonColumnDefinitions(): ColumnDefinition[] {
  return PERSON_FIELD_CATALOG.map(personFieldToColumnDefinition);
}

/**
 * Spreadsheet-eligible Person columns (catalog projection).
 * Prefer this for column pickers; Saved Views still store field-id composition.
 */
export function listSpreadsheetPersonColumnDefinitions(): ColumnDefinition[] {
  return getSpreadsheetPersonFields().map(personFieldToColumnDefinition);
}

/**
 * Build SpreadsheetColumn layout entries from catalog field ids.
 * Unknown ids are skipped (never invent columns).
 */
export function columnsFromFieldIds(
  fieldIds: readonly SpreadsheetFieldId[],
): SpreadsheetColumn[] {
  const columns: SpreadsheetColumn[] = [];
  let order = 0;
  for (const fieldId of fieldIds) {
    if (!getPersonField(fieldId as keyof Person)) continue;
    columns.push({ fieldId, order });
    order += 1;
  }
  return columns;
}

/** Resolve a SavedView against the Person catalog into a SpreadsheetView. */
export function resolvePersonSpreadsheetView(saved: SavedView): SpreadsheetView {
  const ordered = [...saved.columns].sort((a, b) => a.order - b.order);
  const columns: ColumnDefinition[] = [];
  const visibleColumns: ColumnDefinition[] = [];

  for (const col of ordered) {
    const def = getPersonColumnDefinition(col.fieldId);
    if (!def) continue;

    const resolved: ColumnDefinition = {
      ...def,
      defaultWidth: col.width ?? def.defaultWidth,
      defaultAlign: col.align ?? def.defaultAlign,
    };
    columns.push(resolved);
    if (!col.hidden) visibleColumns.push(resolved);
  }

  return { saved, columns, visibleColumns };
}
