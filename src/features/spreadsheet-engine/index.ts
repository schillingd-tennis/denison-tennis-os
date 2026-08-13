/**
 * Spreadsheet Engine (BP-038A) — architecture foundation.
 *
 * No grid UI in this milestone. Future spreadsheet pages, CSV export, saved
 * views, filters, search, and AI query planners import from this module and
 * resolve columns exclusively through domain field catalogs (Person today).
 *
 * @see docs/SPREADSHEET_ENGINE.md
 */

export {
  columnsFromFieldIds,
  getPersonColumnDefinition,
  listPersonColumnDefinitions,
  listSpreadsheetPersonColumnDefinitions,
  personFieldToColumnDefinition,
  resolvePersonSpreadsheetView,
} from "./columnFromCatalog";

export {
  defaultExportFilename,
  exportDefinitionFromSavedView,
  resolveExportColumns,
  type BuildExportOptions,
} from "./exportDefinition";

export {
  FILTER_OPERATORS_BY_TYPE,
  filterRequiresValue,
  filterRequiresValueTo,
  isOperatorAllowedForType,
  isSpreadsheetFilter,
  operatorsForFieldType,
} from "./filters";

export { isMultiColumnSort, normalizeSorts, primarySort } from "./sort";

export {
  ACADEMICS_VIEW,
  ADMISSIONS_VIEW,
  createCustomPersonView,
  getPersonSavedViewPreset,
  listPersonSavedViewPresets,
  PERSON_SAVED_VIEW_PRESETS,
  RECRUITING_VIEW,
  ROSTER_VIEW,
  TRAVEL_MANIFEST_VIEW,
} from "./views";

export type {
  ColumnAlign,
  ColumnDefinition,
  ColumnGroup,
  ExportDefinition,
  ExportScope,
  FilterOperator,
  FilterValue,
  SavedView,
  SortDirection,
  SpreadsheetColumn,
  SpreadsheetEditorKind,
  SpreadsheetFieldId,
  SpreadsheetFilter,
  SpreadsheetFormatterKind,
  SpreadsheetGroupBy,
  SpreadsheetSort,
  SpreadsheetView,
  SpreadsheetViewKind,
} from "./types";
