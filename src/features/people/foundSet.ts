/**
 * Team found-set session keys (BP-025F / BP-027 / BP-038B).
 *
 * Column definitions live in `directoryColumns.ts` and project Person fields
 * from the Field Catalog / Spreadsheet ColumnDefinition pipeline.
 */

export {
  TEAM_FOUND_SET_COLUMNS,
  type TeamDirectoryColumnId,
} from "./directoryColumns";

/** Session key for the Team nav surface's published found set. */
export const TEAM_FOUND_SET_MODULE_KEY = "team";

/** Filename stem for Team CSV downloads (`Team-2026-08-05.csv`). */
export const TEAM_FOUND_SET_FILENAME_BASE = "Team";

export { EMPTY_VALUE } from "@/lib/formatting";
