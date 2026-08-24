import { readFileSync } from "node:fs";

import { isProductionSupabaseHost } from "../appleMessages";

export type HelperPublicConfig = {
  supabaseUrl: string;
};

export class HelperConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HelperConfigError";
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

export function parseHelperConfig(raw: string): HelperPublicConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HelperConfigError("apple-messages.json is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HelperConfigError("apple-messages.json must be a JSON object.");
  }
  const record = parsed as Record<string, unknown>;
  for (const key of SECRET_CONFIG_KEYS) {
    if (key in record) {
      throw new HelperConfigError("Service-role keys must not be stored in apple-messages.json.");
    }
  }
  const supabaseUrl = typeof record.supabaseUrl === "string" ? record.supabaseUrl.trim() : "";
  if (!supabaseUrl) {
    throw new HelperConfigError("apple-messages.json must include supabaseUrl (public Supabase URL).");
  }
  return { supabaseUrl };
}

export function readHelperConfigFile(
  path: string,
  readFile: (path: string, encoding: "utf8") => string = readFileSync,
): HelperPublicConfig {
  return parseHelperConfig(readFile(path, "utf8"));
}

export function supabaseHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    throw new ProductionHostError(`Invalid Supabase URL: ${url}`);
  }
}

export function assertProductionSupabaseUrl(url: string): void {
  const host = supabaseHostFromUrl(url);
  if (!isProductionSupabaseHost(host)) {
    throw new ProductionHostError(
      `Apple Messages helper refuses non-production Supabase host: ${host}`,
    );
  }
}
