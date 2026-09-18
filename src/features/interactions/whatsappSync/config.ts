import { readFileSync, writeFileSync, existsSync } from "node:fs";

import { isLocalSupabaseHost, isProductionSupabaseHost } from "../whatsapp";
import {
  INACTIVE_SUPABASE_HOST,
  VERIFIED_PRODUCTION_SUPABASE_HOST,
  VERIFIED_PRODUCTION_SUPABASE_URL,
} from "./destination";

export type WhatsAppHelperPublicConfig = {
  supabaseUrl: string;
};

export type WhatsAppHelperMode = "local" | "live";

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

export class ProductionHostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionHostError";
  }
}

const SECRET_CONFIG_KEYS = [
  "serviceRole",
  "serviceRoleKey",
  "supabaseServiceRoleKey",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export function supabaseHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    throw new WhatsAppHelperConfigError(`Invalid Supabase URL: ${url}`);
  }
}

export function helperModeFromUrl(url: string): WhatsAppHelperMode {
  const host = supabaseHostFromUrl(url);
  if (isLocalSupabaseHost(host)) return "local";
  if (isProductionSupabaseHost(host)) return "live";
  throw new WhatsAppHelperConfigError(
    `Unsupported Supabase host for WhatsApp helper: ${host}. Use local (127.0.0.1) or production *.supabase.co.`,
  );
}

export function assertLocalDevSupabaseUrlForHelper(url: string): void {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    throw new LocalDevHostError(`Invalid Supabase URL for WhatsApp helper: ${url}`);
  }
  if (isProductionSupabaseHost(host) || host.toLowerCase().endsWith(".supabase.co")) {
    throw new LocalDevHostError(
      `WhatsApp local mode refuses production Supabase host: ${host}.`,
    );
  }
  if (!isLocalSupabaseHost(host)) {
    throw new LocalDevHostError(
      `WhatsApp local mode refuses non-local Supabase host: ${host}. Use 127.0.0.1 or localhost.`,
    );
  }
}

export function assertProductionSupabaseUrl(url: string): void {
  const host = supabaseHostFromUrl(url).toLowerCase();
  if (host === INACTIVE_SUPABASE_HOST) {
    throw new ProductionHostError(
      `WhatsApp helper refuses inactive Supabase host: ${host}`,
    );
  }
  if (!isProductionSupabaseHost(host)) {
    throw new ProductionHostError(
      `WhatsApp helper refuses non-production Supabase host: ${host}`,
    );
  }
}

/** Live tick: production host must match the configured destination (verified OS DB allowed). */
export function assertLiveDestinationUrl(url: string, configuredDestinationHost?: string): void {
  assertProductionSupabaseUrl(url);
  const host = supabaseHostFromUrl(url).toLowerCase();
  if (configuredDestinationHost) {
    const expected = configuredDestinationHost.toLowerCase().replace(/:\d+$/, "");
    if (host !== expected) {
      throw new ProductionHostError(
        `WhatsApp live destination mismatch: configured ${expected}, got ${host}`,
      );
    }
  }
  // Allow any *.supabase.co production host that matches config; verified host is preferred.
  if (host !== VERIFIED_PRODUCTION_SUPABASE_HOST && !host.endsWith(".supabase.co")) {
    throw new ProductionHostError(`WhatsApp helper refuses host: ${host}`);
  }
}

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
    throw new WhatsAppHelperConfigError("whatsapp.json must include supabaseUrl (public Supabase URL).");
  }
  // Validate mode without writing secrets.
  helperModeFromUrl(supabaseUrl);
  return { supabaseUrl };
}

export function readWhatsAppHelperConfigFile(
  path: string,
  readFile: (path: string, encoding: "utf8") => string = readFileSync,
): WhatsAppHelperPublicConfig {
  return parseWhatsAppHelperConfig(readFile(path, "utf8"));
}

export function writeLiveDestinationConfig(
  path: string,
  url: string = VERIFIED_PRODUCTION_SUPABASE_URL,
): WhatsAppHelperPublicConfig {
  assertLiveDestinationUrl(url);
  const config: WhatsAppHelperPublicConfig = { supabaseUrl: url };
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return config;
}

export function writeOrUpdateHelperConfig(
  path: string,
  supabaseUrl: string,
): WhatsAppHelperPublicConfig {
  helperModeFromUrl(supabaseUrl);
  const config: WhatsAppHelperPublicConfig = { supabaseUrl };
  if (existsSync(path)) {
    // Re-parse existing to reject secret keys if someone added them.
    const existing = readWhatsAppHelperConfigFile(path);
    void existing;
  }
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return config;
}

export { VERIFIED_PRODUCTION_SUPABASE_HOST, VERIFIED_PRODUCTION_SUPABASE_URL };
