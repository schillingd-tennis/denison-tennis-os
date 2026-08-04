/**
 * Supabase client for Client Components (BP-016 Phase 1).
 *
 * Uses `@supabase/ssr`'s browser client, which persists the auth session
 * in cookies so it can be read back by the server client and by
 * `src/proxy.ts`. Create a fresh client per call site rather than a module
 * singleton — this is the pattern the SSR helpers are designed around.
 */
import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createBrowserClient(url, publishableKey);
}
