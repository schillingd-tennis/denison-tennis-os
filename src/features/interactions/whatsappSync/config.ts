import { readFileSync } from "node:fs";

import { assertLocalDevSupabaseUrl } from "../whatsapp";

export type WhatsAppHelperPublicConfig = {
  supabaseUrl: string;
};

export class WhatsAppHelperConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppHelperConfigError";
  }
}

export class LocalDevHostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalDevHostError";
  }
}

const SECRET_CONFIG_KEYS = [
  "serviceRole",
  "serviceRoleKey",
  "supabaseServiceRoleKey",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export function parseWhatsAppHelperConfig(raw: string): WhatsAppHelperPublicConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new WhatsAppHelperConfigError("whatsapp.json is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new WhatsAppHelperConfigError("whatsapp.json must be a JSON object.");
  }
  const record = parsed as Record<string, unknown>;
  for (const key of SECRET_CONFIG_KEYS) {
    if (key in record) {
      throw new WhatsAppHelperConfigError("Service-role keys must not be stored in whatsapp.json.");
    }
  }
  const supabaseUrl = typeof record.supabaseUrl === "string" ? record.supabaseUrl.trim() : "";
  if (!supabaseUrl) {
    throw new WhatsAppHelperConfigError("whatsapp.json must include supabaseUrl (local Supabase URL).");
  }
  try {
    assertLocalDevSupabaseUrl(supabaseUrl);
  } catch (error) {
    throw new LocalDevHostError(error instanceof Error ? error.message : String(error));
  }
  return { supabaseUrl };
}

export function readWhatsAppHelperConfigFile(
  path: string,
  readFile: (path: string, encoding: "utf8") => string = readFileSync,
): WhatsAppHelperPublicConfig {
  return parseWhatsAppHelperConfig(readFile(path, "utf8"));
}

export function assertLocalDevSupabaseUrlForHelper(url: string): void {
  try {
    assertLocalDevSupabaseUrl(url);
  } catch (error) {
    throw new LocalDevHostError(error instanceof Error ? error.message : String(error));
  }
}
