import { isLocalSupabaseHost, isProductionSupabaseHost } from "../whatsapp";

/**
 * Manual WhatsApp sync is available only when the Next.js app points at local Supabase.
 * Inverted from Apple Messages (production-only).
 */
export function isManualWhatsAppSyncAvailable(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
): boolean {
  try {
    const host = new URL(supabaseUrl).host;
    if (isProductionSupabaseHost(host) || host.toLowerCase().endsWith(".supabase.co")) {
      return false;
    }
    return isLocalSupabaseHost(host);
  } catch {
    return false;
  }
}
