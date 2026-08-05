import type { FoundSetColumn } from "./types";

/** Coerce a cell value to a plain string for copy / CSV export. */
export function cellToString(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

/** Build header + row matrix from the current found set. */
export function buildFoundSetMatrix<T>(
  rows: T[],
  columns: FoundSetColumn<T>[],
): { headers: string[]; rows: string[][] } {
  const headers = columns.map((column) => column.title);
  const matrix = rows.map((row) =>
    columns.map((column) => cellToString(column.accessor(row))),
  );
  return { headers, rows: matrix };
}

/**
 * Escape a single cell for tab-delimited paste into Excel / Sheets / etc.
 * Tabs and newlines become spaces so column alignment is preserved.
 */
export function escapeTabDelimitedCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trimEnd();
}

/** Tab-delimited text with a header row — clipboard-ready for spreadsheets. */
export function toTabDelimited(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeTabDelimitedCell).join("\t"),
    ...rows.map((row) => row.map(escapeTabDelimitedCell).join("\t")),
  ];
  return `${lines.join("\n")}\n`;
}

/** RFC 4180-style CSV cell escaping. */
export function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV document with a header row. */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Intelligent export filename, e.g. `Team-2026-08-05.csv` or
 * `Recruiting-2027.csv` when a qualifier is supplied.
 */
export function buildExportFilename({
  module,
  qualifier,
  date = new Date(),
  extension = "csv",
}: {
  module: string;
  qualifier?: string;
  date?: Date;
  extension?: string;
}): string {
  const safeModule = module.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "");
  const safeQualifier = qualifier
    ?.trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "");

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const stamp = `${year}-${month}-${day}`;

  const stem = safeQualifier ? `${safeModule}-${safeQualifier}` : `${safeModule}-${stamp}`;
  return `${stem}.${extension}`;
}
