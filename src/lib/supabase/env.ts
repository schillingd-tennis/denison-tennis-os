/**
 * Shared Supabase environment variable resolution for the auth-aware
 * client factories in this directory (browser / server / proxy).
 *
 * Kept separate from `src/lib/supabase.ts` (the Team module's read-only
 * infrastructure client, see `docs/ARCHITECTURE.md` §3E) so that adding
 * authentication does not change how the existing repository connects to
 * Supabase.
 */

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local (see .env.local.example if present)."
    );
  }

  if (!publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set it in .env.local (see .env.local.example if present)."
    );
  }

  return { url, publishableKey };
}
