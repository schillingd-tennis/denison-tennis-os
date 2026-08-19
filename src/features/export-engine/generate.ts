import { matrixToCsv } from "./csv";
import { buildExportMatrix, resolveExportFields } from "./matrix";
import type { ExportFormat, ExportRequest } from "./types";
import { matrixToXlsx } from "./xlsx";

function stemFrom(moduleName: string, presetLabel: string, date = new Date()): string {
  const safeModule = moduleName.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "");
  const safePreset = presetLabel.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${safeModule}-${safePreset}-${year}-${month}-${day}`;
}

export function buildExportFilename(
  filenameBase: string,
  presetLabel: string,
  format: ExportFormat,
  date = new Date(),
): string {
  return `${stemFrom(filenameBase, presetLabel, date)}.${format}`;
}

function triggerDownload(filename: string, contents: BlobPart, mimeType: string) {
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

/** Build bytes + filename without touching the DOM (tests / future server use). */
export function generateExportFile<TRow>(request: ExportRequest<TRow>): {
  filename: string;
  mimeType: string;
  body: BlobPart;
  rowCount: number;
} {
  const preset = request.module.presets.find((entry) => entry.id === request.presetId);
  const presetLabel = preset?.label ?? "Export";
  const fields = resolveExportFields(request.module.fields, request.fieldIds);
  const matrix = buildExportMatrix(request.rows, fields);
  const filename = buildExportFilename(request.module.filenameBase, presetLabel, request.format);

  if (request.format === "csv") {
    const csv = matrixToCsv(matrix.headers, matrix.rows);
    return {
      filename,
      mimeType: "text/csv;charset=utf-8",
      body: `\uFEFF${csv}`,
      rowCount: matrix.rows.length,
    };
  }

  return {
    filename,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: matrixToXlsx(matrix) as BlobPart,
    rowCount: matrix.rows.length,
  };
}

/** Browser download of an ExportRequest. */
export function downloadExport<TRow>(request: ExportRequest<TRow>): { rowCount: number; filename: string } {
  const file = generateExportFile(request);
  triggerDownload(file.filename, file.body, file.mimeType);
  return { rowCount: file.rowCount, filename: file.filename };
}
