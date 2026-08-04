import { readFileSync } from "node:fs";

import { parse } from "csv-parse/sync";

import type { RawPlayerRow } from "./types";

/**
 * Reads a CSV file into an array of header-keyed rows. Strips a leading
 * UTF-8 BOM (Airtable exports include one) and trims whitespace from every
 * cell so downstream normalization never has to think about stray spaces.
 */
export function readCsvRows(filePath: string): { headers: string[]; rows: RawPlayerRow[] } {
  const raw = readFileSync(filePath, "utf-8");

  const records: RawPlayerRow[] = parse(raw, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  return { headers, rows: records };
}
