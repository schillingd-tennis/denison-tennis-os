/**
 * Universal Found Set utilities (BP-021).
 *
 * Copy / export the rows currently in view — after search, filters, and
 * sort — as tab-delimited text or CSV. Pair with `StickyProductivityActionBar`
 * on any module table or workspace.
 */
export type { FoundSetColumn, FoundSetSnapshot } from "./types";
export {
  buildExportFilename,
  buildFoundSetMatrix,
  cellToString,
  escapeCsvCell,
  escapeTabDelimitedCell,
  toCsv,
  toTabDelimited,
} from "./serialize";
export { copyFoundSet, copyFoundSetSnapshot } from "./copyFoundSet";
export { exportFoundSetCsv, exportFoundSetSnapshotCsv } from "./exportFoundSet";
export { publishFoundSet, readFoundSetSnapshot } from "./sessionFoundSet";
