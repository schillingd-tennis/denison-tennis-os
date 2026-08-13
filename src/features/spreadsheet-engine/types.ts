/**
 * Spreadsheet Engine foundation types (BP-038A).
 *
 * Architecture only — no grid UI. Future Team / Recruiting / Travel /
 * Admissions / Academics spreadsheet surfaces consume these models.
 * Column identity and capabilities always resolve from a domain field
 * catalog (Person: `fieldCatalog.ts`) — never redefine fields here.
 */

import type { PersonFieldType as FieldType } from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

/** Stable field id — Person catalog keys today; other domains later. */
export type SpreadsheetFieldId = keyof Person | (string & {});

/** How a cell value is presented (maps from catalog field type). */
export type SpreadsheetFormatterKind =
  | "text"
  | "longText"
  | "date"
  | "number"
  | "boolean"
  | "enum"
  | "phone"
  | "email"
  | "url"
  | "currency"
  | "percentage"
  | "relationship"
  | "secureText"
  | "system"
  | "json";

/**
 * Editor widget the future grid will mount (maps from Field Engine types).
 * Attachment reserved for future.
 */
export type SpreadsheetEditorKind =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "select"
  | "tel"
  | "email"
  | "url"
  | "checkbox"
  | "readonly";

export type ColumnAlign = "left" | "right" | "center";

/**
 * Resolved column definition for the engine — always derived from a catalog
 * field. Modules must not invent parallel ColumnDefinitions for Person data.
 */
export type ColumnDefinition = {
  /** Catalog field key (e.g. `passportNumber`). */
  fieldId: SpreadsheetFieldId;
  /** Display title (catalog `label`). */
  title: string;
  /** Catalog data type. */
  dataType: FieldType;
  /** Presentation formatter kind (from catalog type). */
  formatter: SpreadsheetFormatterKind;
  /** Inline / grid editor kind (from catalog type). */
  editor: SpreadsheetEditorKind;
  /** CSV / Excel header (catalog `csvLabel` ?? `label`). */
  csvLabel: string;
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
  sensitive: boolean;
  editable: boolean;
  defaultWidth: number;
  defaultAlign: ColumnAlign;
  /** Enum options when `dataType === "enum"`. */
  enumValues?: readonly { value: string; label: string }[];
  /** Optional catalog section for grouping chrome. */
  section?: string;
};

/**
 * A column instance inside a view — references a ColumnDefinition by field id
 * and adds view-local layout state (order, pin, width override, visibility).
 */
export type SpreadsheetColumn = {
  fieldId: SpreadsheetFieldId;
  /** Explicit order within the view (0-based). */
  order: number;
  hidden?: boolean;
  /** Sticky / pinned to the leading edge. */
  pinned?: boolean;
  /** Frozen with the leading pin group (future grid chrome). */
  frozen?: boolean;
  /** Override catalog default width for this view. */
  width?: number;
  /** Override catalog default alignment for this view. */
  align?: ColumnAlign;
};

/** Named group of columns (e.g. Travel Documents) — presentation metadata. */
export type ColumnGroup = {
  id: string;
  label: string;
  fieldIds: readonly SpreadsheetFieldId[];
  collapsed?: boolean;
};

/** Filter operators supported by the engine (UI later). */
export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "before"
  | "after"
  | "between"
  | "empty"
  | "not_empty"
  | "in"
  | "not_in"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type FilterValue = string | number | boolean | null | readonly (string | number)[];

export type SpreadsheetFilter = {
  id: string;
  fieldId: SpreadsheetFieldId;
  operator: FilterOperator;
  /** Primary value (equals/contains/before/gt/…). */
  value?: FilterValue;
  /** Second bound for `between`. */
  valueTo?: FilterValue;
};

export type SortDirection = "asc" | "desc";

export type SpreadsheetSort = {
  fieldId: SpreadsheetFieldId;
  direction: SortDirection;
};

/** Built-in / product view kinds (no UI yet). */
export type SpreadsheetViewKind =
  | "roster"
  | "recruiting"
  | "travel_manifest"
  | "admissions"
  | "academics"
  | "custom";

/**
 * Persisted / preset spreadsheet view configuration.
 * Alias of the deliverable name `SavedView`.
 */
export type SavedView = {
  id: string;
  name: string;
  kind: SpreadsheetViewKind;
  /** Module / surface that owns this view (e.g. `people`, `recruiting`). */
  moduleId: string;
  description?: string;
  /** Column layout — field ids must exist in the catalog for that module. */
  columns: readonly SpreadsheetColumn[];
  columnGroups?: readonly ColumnGroup[];
  filters?: readonly SpreadsheetFilter[];
  /** Single- or multi-column sort (order = priority). */
  sorts?: readonly SpreadsheetSort[];
  /** Free-text search query applied against searchable catalog fields. */
  searchQuery?: string;
  isDefault?: boolean;
  /** Future: restrict to roles (e.g. `head_coach`). */
  roleKeys?: readonly string[];
  createdAt?: string;
  updatedAt?: string;
  createdByUserId?: string;
};

/** Runtime view = saved config + resolved ColumnDefinitions. */
export type SpreadsheetView = {
  saved: SavedView;
  /** Resolved columns in view order (hidden included unless filtered by helper). */
  columns: readonly ColumnDefinition[];
  /** Visible columns only, in order. */
  visibleColumns: readonly ColumnDefinition[];
};

/** Scope of rows included in an export. */
export type ExportScope =
  | "found_set"
  | "current_view"
  | "selection"
  | "all_matching_filters";

/**
 * Reusable export configuration. Exporters consume only Field Catalog
 * metadata via resolved ColumnDefinitions — never ad-hoc field lists.
 */
export type ExportDefinition = {
  id: string;
  /** Human label for the export preset. */
  name: string;
  format: "csv" | "xlsx";
  /** Field ids in export order (catalog-backed). */
  fieldIds: readonly SpreadsheetFieldId[];
  /** When true, include columns marked hidden on the source view. */
  includeHiddenFields?: boolean;
  /** When false, omit catalog `sensitive` fields even if listed. */
  includeSensitiveFields?: boolean;
  /**
   * Formatting: `display` uses Field Engine formatters; `raw` uses stored
   * values (ISO dates, enum keys, unmasked secure fields when permitted).
   */
  valueFormat?: "display" | "raw";
  filename?: string;
  scope?: ExportScope;
  /** Optional view this export was built from. */
  sourceViewId?: string;
};

/** Future grouping spec (architecture placeholder). */
export type SpreadsheetGroupBy = {
  fieldId: SpreadsheetFieldId;
  direction?: SortDirection;
  collapsedGroups?: readonly string[];
};
