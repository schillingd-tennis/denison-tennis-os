import { buildFoundSetMatrix, toTabDelimited } from "./serialize";
import type { FoundSetColumn, FoundSetSnapshot } from "./types";

/**
 * Copy the current found set to the clipboard as tab-delimited text
 * (headers + rows). Pastes cleanly into Excel, Numbers, Google Sheets,
 * Airtable, Coda, and email.
 */
export async function copyFoundSet<T>(
  rows: T[],
  columns: FoundSetColumn<T>[],
): Promise<void> {
  const matrix = buildFoundSetMatrix(rows, columns);
  const text = toTabDelimited(matrix.headers, matrix.rows);
  await navigator.clipboard.writeText(text);
}

/** Copy a previously published snapshot (e.g. from the Player Workspace). */
export async function copyFoundSetSnapshot(snapshot: FoundSetSnapshot): Promise<void> {
  const text = toTabDelimited(snapshot.headers, snapshot.rows);
  await navigator.clipboard.writeText(text);
}
