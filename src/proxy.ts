/**
 * Next.js Proxy (BP-016 Phase 1) — the App Router's replacement for
 * `middleware.ts` as of Next.js 16 (see `node_modules/next/dist/docs/
 * 01-app/03-api-reference/03-file-conventions/proxy.md`).
 *
 * Two jobs, both required for Supabase SSR auth to work correctly:
 *
 * 1. Refresh the auth session cookie on every request by calling
 *    `supabase.auth.getUser()`, which revalidates the token against
 *    Supabase Auth (unlike `getSession()`, which only reads the cookie).
 *    Server Components can't write cookies themselves, so without this,
 *    sessions would silently expire.
 * 2. Perform the optimistic redirect: send unauthenticated requests for
 *    any non-public route to `/login`, and signed-in requests for
 *    `/login` back to the app.
 *
 * This is an optimistic check, not the only line of defense — see
 * `docs/app/guides/authentication#authorization` in the bundled Next.js
 * docs. Server Actions and Route Handlers added in later phases must
 * still verify the session themselves via `createSupabaseServerClient()`.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

const PUBLIC_ROUTES = ["/login"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
