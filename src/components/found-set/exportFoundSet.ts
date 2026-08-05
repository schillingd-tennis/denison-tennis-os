import { buildExportFilename, buildFoundSetMatrix, toCsv } from "./serialize";
import type { FoundSetColumn, FoundSetSnapshot } from "./types";

function triggerDownload(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Download the current found set as a CSV file — visible columns only,
 * in the current sort/filter order.
 */
export function exportFoundSetCsv<T>({
  rows,
  columns,
  filenameBase,
  qualifier,
}: {
  rows: T[];
  columns: FoundSetColumn<T>[];
  /** Stem used for the intelligent filename (e.g. `"Team"`). */
  filenameBase: string;
  /** Optional qualifier (e.g. `"2027"` → `Recruiting-2027.csv`). */
  qualifier?: string;
}): void {
  const matrix = buildFoundSetMatrix(rows, columns);
  const filename = buildExportFilename({ module: filenameBase, qualifier });
  const csv = toCsv(matrix.headers, matrix.rows);
  triggerDownload(filename, csv, "text/csv;charset=utf-8");
}

/** Export a previously published snapshot as CSV. */
export function exportFoundSetSnapshotCsv(snapshot: FoundSetSnapshot): void {
  const filename = buildExportFilename({ module: snapshot.filenameBase });
  const csv = toCsv(snapshot.headers, snapshot.rows);
  triggerDownload(filename, csv, "text/csv;charset=utf-8");
}
