import { closeSync, constants, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

export class SyncLockHeldError extends Error {
  constructor(lockPath: string) {
    super(`Apple Messages sync lock is already held (${lockPath}).`);
    this.name = "SyncLockHeldError";
  }
}

/**
 * Exclusive file lock for a single helper process. Uses O_EXCL create so a
 * second acquire in the same or another process fails immediately.
 */
export class ProcessFileLock {
  private fd: number | null = null;

  constructor(readonly lockPath: string) {}

  get held(): boolean {
    return this.fd !== null;
  }

  acquire(): void {
    if (this.fd !== null) {
      throw new SyncLockHeldError(this.lockPath);
    }
    if (existsSync(this.lockPath) && !pidIsAlive(readLockPid(this.lockPath))) {
      unlinkSync(this.lockPath);
    }
    try {
      this.fd = openSync(this.lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") throw new SyncLockHeldError(this.lockPath);
      throw error;
    }
    writeFileSync(this.fd, `${process.pid}\n`);
  }

  release(): void {
    if (this.fd === null) return;
    closeSync(this.fd);
    this.fd = null;
    try {
      unlinkSync(this.lockPath);
    } catch {
      // Lock file may already be gone.
    }
  }
}

export function withSyncLock<T>(lockPath: string, fn: () => T): T {
  const lock = new ProcessFileLock(lockPath);
  lock.acquire();
  try {
    return fn();
  } finally {
    lock.release();
  }
}

function readLockPid(lockPath: string): number | null {
  try {
    const raw = readFileSync(lockPath, "utf8").trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function pidIsAlive(pid: number | null): boolean {
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
