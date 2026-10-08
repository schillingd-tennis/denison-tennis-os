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

import { isScoutingPublicFormPath } from "@/features/scouting/formTokens";
import { getSupabaseEnv } from "@/lib/supabase/env";

const PUBLIC_AUTH_ROUTES = ["/login"];

function readJwtIssuedAt(accessToken: string | undefined): number | null {
  if (!accessToken) return null;

  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { iat?: unknown };
    return typeof decoded.iat === "number" ? decoded.iat : null;
  } catch {
    return null;
  }
}

function clearSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): void {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") || cookie.name.includes("supabase")) {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
        sameSite: "lax",
      });
    }
  }
}

function isLoginRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function allowsUnauthenticated(pathname: string): boolean {
  return isLoginRoute(pathname) || isScoutingPublicFormPath(pathname);
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
    error: authError,
  } = await supabase.auth.getUser();

  // getUser() is validated by GoTrue, whose clock can disagree briefly with
  // PostgREST after a Mac wakes. Inspect the JWT ourselves as well so a token
  // that GoTrue accepts but PostgREST rejects cannot strand the whole app.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const issuedAt = readJwtIssuedAt(session?.access_token);
  const tokenIsFutureDated =
    issuedAt !== null && issuedAt > Math.floor(Date.now() / 1000);

  const { pathname } = request.nextUrl;

  // Docker Desktop can briefly drift from the macOS clock after sleep. Any
  // session minted during that window is rejected as future-dated on every
  // subsequent request. Recover once at the edge instead of allowing every
  // database-backed module to fail independently.
  if (
    (authError && /JWT issued at future/i.test(authError.message)) ||
    tokenIsFutureDated
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", isLoginRoute(pathname) ? "/" : pathname);
    loginUrl.searchParams.set("reason", "session-clock-reset");
    const resetResponse = NextResponse.redirect(loginUrl);
    clearSupabaseSession(request, resetResponse);
    return resetResponse;
  }

  if (!user && !allowsUnauthenticated(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
