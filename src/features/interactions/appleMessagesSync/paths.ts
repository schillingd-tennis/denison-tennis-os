import { homedir } from "node:os";
import { join } from "node:path";

/** Directory name under Application Support. Overridable for tests and LaunchAgent. */
export const APPLE_MESSAGES_APP_SUPPORT_DIR = "DenisonTennisOS";
export const APPLE_MESSAGES_HOME_ENV = "DENISON_APPLE_MESSAGES_HOME";
export const SYNC_DB_FILENAME = "apple-messages-sync.sqlite";
export const SYNC_LOCK_FILENAME = "apple-messages-sync.lock";

export function defaultAppleMessagesHome(): string {
  const fromEnv = process.env[APPLE_MESSAGES_HOME_ENV]?.trim();
  if (fromEnv) return fromEnv;
  return join(homedir(), "Library/Application Support", APPLE_MESSAGES_APP_SUPPORT_DIR);
}

export function syncDatabasePath(home: string): string {
  return join(home, SYNC_DB_FILENAME);
}

export function syncLockPath(home: string): string {
  return join(home, SYNC_LOCK_FILENAME);
}

export function helperConfigPath(home: string): string {
  return join(home, "apple-messages.json");
}
