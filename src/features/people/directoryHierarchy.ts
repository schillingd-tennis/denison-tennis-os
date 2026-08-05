import { typeRole } from "@/components/typography";
import { EMPTY_VALUE, formatDisplay } from "@/lib/formatting";

/**
 * BP-025H — Team directory information hierarchy.
 *
 * Only names receive emphasis. Everything else is metadata and must use
 * `TEAM_DIRECTORY_META`. Future List columns inherit that token unless
 * explicitly promoted.
 */

/** Primary — Name only. */
export const TEAM_DIRECTORY_NAME = typeRole.personName;

/** Secondary — Role, Hometown, Class, UTR, WTN, and future directory columns. */
export const TEAM_DIRECTORY_META = typeRole.directoryMeta;

/** Missing-value glyph — shared OS empty (BP-027). */
export const TEAM_DIRECTORY_EMPTY = EMPTY_VALUE;

/** Normalize a directory cell value to either content or `—`. */
export function directoryCellValue(value: string | number | undefined | null): string {
  return formatDisplay(value);
}
