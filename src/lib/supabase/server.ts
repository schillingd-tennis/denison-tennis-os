/**
 * Supabase client for Server Components, Server Actions, and Route
 * Handlers (BP-016 Phase 1).
 *
 * Backs the auth session with Next.js's async `cookies()` store. Always
 * create a new client per request — never cache/share this across
 * requests.
 *
 * Server Components cannot write cookies (Next.js throws if you try), so
 * `setAll` below is wrapped in a try/catch. That's safe as long as
 * `src/proxy.ts` refreshes the session cookie on every request; a render
 * that can't persist a refreshed token simply keeps using the
 * previously-valid session until the next request passes through proxy.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render — no-op; proxy.ts
          // handles refreshing the session cookie for these cases.
        }
      },
    },
  });
}
