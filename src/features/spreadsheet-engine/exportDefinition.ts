/**
 * ExportDefinition builders (BP-038A).
 *
 * CSV / future Excel exporters must resolve columns only through the Field
 * Catalog (via ColumnDefinition). No ad-hoc field title maps.
 */

import { getPersonColumnDefinition, resolvePersonSpreadsheetView } from "./columnFromCatalog";
import type {
  ColumnDefinition,
  ExportDefinition,
  ExportScope,
  SavedView,
  SpreadsheetFieldId,
} from "./types";

export type BuildExportOptions = {
  id?: string;
  name?: string;
  format?: "csv" | "xlsx";
  /** Override field order; defaults to visible view columns (or all when includeHidden). */
  fieldIds?: readonly SpreadsheetFieldId[];
  includeHiddenFields?: boolean;
  includeSensitiveFields?: boolean;
  valueFormat?: "display" | "raw";
  filename?: string;
  scope?: ExportScope;
};

/** Default CSV filename stem from a view name (`Travel-Manifest-2026-08-10`). */
export function defaultExportFilename(viewName: string, format: "csv" | "xlsx" = "csv"): string {
  const stem = viewName
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  return `${stem || "export"}-${date}.${format}`;
}

/**
 * Build an ExportDefinition from a SavedView.
 * Field ids are catalog-backed; unknown ids are dropped.
 */
export function exportDefinitionFromSavedView(
  saved: SavedView,
  options: BuildExportOptions = {},
): ExportDefinition {
  const format = options.format ?? "csv";
  const includeHidden = options.includeHiddenFields === true;
  const resolved = resolvePersonSpreadsheetView(saved);

  const fromView = (includeHidden ? resolved.columns : resolved.visibleColumns).map(
    (column) => column.fieldId,
  );

  const requested = options.fieldIds ?? fromView;
  const includeSensitive = options.includeSensitiveFields === true;
  const fieldIds = requested.filter((fieldId) => {
    const column = getPersonColumnDefinition(fieldId);
    if (!column) return false;
    if (column.sensitive && !includeSensitive) return false;
    if (!column.exportable && !includeSensitive) return false;
    return true;
  });

  return {
    id: options.id ?? `export.${saved.id}.${format}`,
    name: options.name ?? `${saved.name} Export`,
    format,
    fieldIds,
    includeHiddenFields: includeHidden,
    includeSensitiveFields: options.includeSensitiveFields === true,
    valueFormat: options.valueFormat ?? "display",
    filename: options.filename ?? defaultExportFilename(saved.name, format),
    scope: options.scope ?? "current_view",
    sourceViewId: saved.id,
  };
}

/** Resolve ExportDefinition field ids to ColumnDefinitions (catalog order ignored — export order wins). */
export function resolveExportColumns(definition: ExportDefinition): ColumnDefinition[] {
  const columns: ColumnDefinition[] = [];
  const includeSensitive = definition.includeSensitiveFields === true;
  for (const fieldId of definition.fieldIds) {
    const column = getPersonColumnDefinition(fieldId);
    if (!column) continue;
    if (column.sensitive && !includeSensitive) continue;
    if (!column.exportable && !includeSensitive) continue;
    columns.push(column);
  }
  return columns;
}
