import type { ExportCellValue } from "./types";

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellToCsv(value: ExportCellValue): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

/** RFC 4180 CSV with a header row. Blank cells stay blank. */
export function matrixToCsv(headers: string[], rows: ExportCellValue[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cellToCsv(cell))).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}
