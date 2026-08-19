/**
 * Universal Export Engine — generic types.
 *
 * File generation is independent of Team UI. Modules supply a field registry,
 * declarative presets, and row populations. Recruiting / Fundraising can reuse
 * the same builder later without Team-specific coupling.
 */

export type ExportFormat = "xlsx" | "csv";

export type ExportWho = "all" | "found_set" | "selection" | "current";

export type ExportValueType = "text" | "number" | "date" | "enum" | "boolean";

/** Primitive cell value. `null` becomes a blank cell (never a UI placeholder). */
export type ExportCellValue = string | number | boolean | null;

export type ExportFieldDefinition<TRow> = {
  id: string;
  /** Human-readable header (not a database column name). */
  label: string;
  /** Domain grouping for Custom field lists (personal, academics, …). */
  group: string;
  type: ExportValueType;
  getValue: (row: TRow) => ExportCellValue;
};

export type ExportPreset = {
  id: string;
  label: string;
  /** Field ids in export order. Empty when `custom` is true. */
  fieldIds: readonly string[];
  custom?: boolean;
};

export type ExportModuleDefinition<TRow> = {
  moduleId: string;
  filenameBase: string;
  fields: readonly ExportFieldDefinition<TRow>[];
  presets: readonly ExportPreset[];
  /** Always start checked (Team: Player Name). User may uncheck. */
  defaultFieldIds?: readonly string[];
};

export type ExportPopulations<TRow> = {
  all: readonly TRow[];
  /** Omit on record workspaces — Who hides "Current Found Set". */
  foundSet?: readonly TRow[];
  /** Omit unless an actual selection was passed in. */
  selection?: readonly TRow[];
  current?: TRow;
};

export type ExportRequest<TRow> = {
  module: ExportModuleDefinition<TRow>;
  rows: readonly TRow[];
  fieldIds: readonly string[];
  format: ExportFormat;
  presetId: string;
  who: ExportWho;
};

export type ExportMatrix = {
  headers: string[];
  /** Parallel to headers; null → blank. */
  rows: ExportCellValue[][];
  fieldTypes: ExportValueType[];
};

export type ExportBuilderEntry<TRow> = {
  module: ExportModuleDefinition<TRow>;
  populations: ExportPopulations<TRow>;
  /** Preset to select when the builder opens. */
  initialPresetId?: string;
  initialWho?: ExportWho;
};
