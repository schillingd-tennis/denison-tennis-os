import type {
  ExportCellValue,
  ExportFieldDefinition,
  ExportMatrix,
  ExportValueType,
} from "./types";

function fieldMap<TRow>(
  fields: readonly ExportFieldDefinition<TRow>[],
): Map<string, ExportFieldDefinition<TRow>> {
  return new Map(fields.map((field) => [field.id, field]));
}

/** Resolve selected field ids to definitions, preserving request order. Unknown ids dropped. */
export function resolveExportFields<TRow>(
  fields: readonly ExportFieldDefinition<TRow>[],
  fieldIds: readonly string[],
): ExportFieldDefinition<TRow>[] {
  const byId = fieldMap(fields);
  const resolved: ExportFieldDefinition<TRow>[] = [];
  for (const id of fieldIds) {
    const field = byId.get(id);
    if (field) resolved.push(field);
  }
  return resolved;
}

export function buildExportMatrix<TRow>(
  rows: readonly TRow[],
  fields: readonly ExportFieldDefinition<TRow>[],
): ExportMatrix {
  const headers = fields.map((field) => field.label);
  const fieldTypes: ExportValueType[] = fields.map((field) => field.type);
  const matrixRows: ExportCellValue[][] = rows.map((row) =>
    fields.map((field) => {
      const value = field.getValue(row);
      if (value === undefined || value === null || value === "") return null;
      return value;
    }),
  );
  return { headers, rows: matrixRows, fieldTypes };
}

/** Initial checked ids for a preset. Custom starts from `defaultFieldIds` only. */
export function initialFieldIdsForPreset(
  preset: { fieldIds: readonly string[]; custom?: boolean },
  defaultFieldIds: readonly string[] = [],
): string[] {
  if (preset.custom) return [...defaultFieldIds];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of [...defaultFieldIds, ...preset.fieldIds]) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
