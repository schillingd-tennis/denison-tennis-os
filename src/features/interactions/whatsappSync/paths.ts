import { homedir } from "node:os";
import { join } from "node:path";

/** Shared Application Support root with Apple Messages; WhatsApp lives in a subfolder. */
export const WHATSAPP_APP_SUPPORT_DIR = "DenisonTennisOS";
export const WHATSAPP_HOME_ENV = "DENISON_WHATSAPP_HOME";
export const WHATSAPP_SUBDIR = "whatsapp";
export const SYNC_DB_FILENAME = "whatsapp-sync.sqlite";
export const SYNC_LOCK_FILENAME = "whatsapp-sync.lock";
export const AUTH_DIRNAME = "auth";
export const CONFIG_FILENAME = "whatsapp.json";
/** Persisted Baileys history/chat cache (not auth secrets). */
export const HISTORY_CACHE_FILENAME = "history-cache.json";

export function defaultWhatsAppHome(): string {
  const fromEnv = process.env[WHATSAPP_HOME_ENV]?.trim();
  if (fromEnv) return fromEnv;
  return join(homedir(), "Library/Application Support", WHATSAPP_APP_SUPPORT_DIR, WHATSAPP_SUBDIR);
}

export function syncDatabasePath(home: string): string {
  return join(home, SYNC_DB_FILENAME);
}

export function syncLockPath(home: string): string {
  return join(home, SYNC_LOCK_FILENAME);
}

export function helperConfigPath(home: string): string {
  return join(home, CONFIG_FILENAME);
}

export function authStatePath(home: string): string {
  return join(home, AUTH_DIRNAME);
}

export function historyCachePath(home: string): string {
  return join(home, HISTORY_CACHE_FILENAME);
}
