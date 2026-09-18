import { isLocalSupabaseHost } from "../whatsapp";

/** Verified live OS Supabase project (same as Apple Messages production). */
export const VERIFIED_PRODUCTION_SUPABASE_HOST = "hvctdzhxfpkyflbihvhv.supabase.co";
export const VERIFIED_PRODUCTION_SUPABASE_URL = `https://${VERIFIED_PRODUCTION_SUPABASE_HOST}`;

/** Inactive project — never target. */
export const INACTIVE_SUPABASE_HOST = "ptclpxniippveqsrsfso.supabase.co";

export const LOCAL_DESTINATION_KEY = "local";

export function destinationKeyFromUrl(url: string): string {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    throw new Error(`Invalid Supabase URL for destination key: ${url}`);
  }
  return destinationKeyFromHost(host);
}

export function destinationKeyFromHost(host: string): string {
  const normalized = host.trim().toLowerCase();
  if (isLocalSupabaseHost(normalized)) return LOCAL_DESTINATION_KEY;
  return normalized.replace(/:\d+$/, "");
}

/**
 * Effective floor for imports.
 * Local: import_from_at only.
 * Production: max(import_from_at, production_activation_at).
 */
export function effectiveImportFloor(options: {
  importFromAt: string | null | undefined;
  productionActivationAt: string | null | undefined;
  destinationKey: string;
}): string | null {
  const importFrom = options.importFromAt?.trim() || null;
  if (options.destinationKey === LOCAL_DESTINATION_KEY) {
    return importFrom;
  }
  const activation = options.productionActivationAt?.trim() || null;
  if (!importFrom && !activation) return null;
  if (!importFrom) return activation;
  if (!activation) return importFrom;
  return importFrom >= activation ? importFrom : activation;
}

export function isVerifiedProductionHost(host: string): boolean {
  const hostname = host
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]:\d+$/, "")
    .replace(/:\d+$/, "");
  return hostname === VERIFIED_PRODUCTION_SUPABASE_HOST;
}
