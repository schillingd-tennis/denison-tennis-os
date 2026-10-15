import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-") || cookie.name.includes("supabase")) {
      cookieStore.set(cookie.name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
        sameSite: "lax",
      });
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", safeNextPath(request.nextUrl.searchParams.get("next")));
  loginUrl.searchParams.set("reason", "session-clock-reset");
  return NextResponse.redirect(loginUrl);
}
