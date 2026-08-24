import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Copy chat.db (and WAL/SHM if present) into destDir. Tests inject copyFile.
 * Never point sourcePath at the live Messages database from tests.
 */
export function copyChatDatabase(
  sourceDb: string,
  destDir: string,
  copyFile: typeof copyFileSync = copyFileSync,
): string {
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, "chat.db");
  copyFile(sourceDb, dest);
  for (const suffix of ["-wal", "-shm"] as const) {
    const extra = `${sourceDb}${suffix}`;
    if (existsSync(extra)) copyFile(extra, `${dest}${suffix}`);
  }
  return dest;
}
