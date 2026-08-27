import { isProductionSupabaseHost } from "../appleMessages";

export function isManualAppleMessagesSyncAvailable(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
): boolean {
  try {
    return isProductionSupabaseHost(new URL(supabaseUrl).host);
  } catch {
    return false;
  }
}
