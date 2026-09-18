import { isLocalSupabaseHost, isProductionSupabaseHost } from "../whatsapp";

/**
 * Manual WhatsApp sync (enqueue jobs / hosted status) is available on production
 * Supabase hosts — mirrors Apple Messages.
 */
export function isManualWhatsAppSyncAvailable(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
): boolean {
  try {
    return isProductionSupabaseHost(new URL(supabaseUrl).host);
  } catch {
    return false;
  }
}

/**
 * Local Mac Application Support status path (sqlite) — only when the app
 * points at local Supabase. Hosted UI must never use this.
 */
export function isLocalWhatsAppMacStatusAvailable(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
): boolean {
  try {
    return isLocalSupabaseHost(new URL(supabaseUrl).host);
  } catch {
    return false;
  }
}
