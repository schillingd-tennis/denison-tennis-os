/**
 * Reusable Supabase client for the app.
 *
 * This is infrastructure-layer code (see `docs/ARCHITECTURE.md` §3E) — it
 * must only ever be imported by repository implementations, never directly
 * by pages or components. As of BP-014 Phase 1 nothing calls this yet; it
 * exists solely to prove the app can connect to Supabase.
 *
 * Uses the publishable (anon) key, which is safe to use in either a server
 * or browser context — it relies on Row Level Security policies on the
 * Supabase side to control access, not secrecy of the key itself.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local (see .env.local.example if present)."
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set it in .env.local (see .env.local.example if present)."
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
