"use server";

/**
 * Login/logout Server Actions (BP-016 Phase 1).
 *
 * Email/password only — there is deliberately no signup action here (see
 * requirement to keep account creation out of Phase 1). Accounts are
 * provisioned manually by David in the Supabase dashboard.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginFormState = { error: string } | undefined;

async function clearSupabaseCookies(): Promise<void> {
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
}

function toSafeRedirectPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function login(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectPath = toSafeRedirectPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  // A stale chunk from an older local session can survive signOut and be
  // recombined with a newly minted session. Remove every auth-cookie chunk
  // before creating the replacement session.
  await clearSupabaseCookies();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  const issuedAt = data.session?.access_token
    ? Number(
        JSON.parse(
          Buffer.from(data.session.access_token.split(".")[1], "base64url").toString(
            "utf8",
          ),
        ).iat,
      )
    : null;

  if (issuedAt && issuedAt > Math.floor(Date.now() / 1000)) {
    await supabase.auth.signOut({ scope: "local" });
    await clearSupabaseCookies();
    return {
      error:
        "The local authentication clock is still synchronizing. Wait a few seconds and sign in again.",
    };
  }

  redirect(redirectPath);
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  await clearSupabaseCookies();
  redirect("/login");
}
