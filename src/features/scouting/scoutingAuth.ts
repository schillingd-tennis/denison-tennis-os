import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ScoutingAuthResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Coaches/admins with write access may archive/restore.
 * Public form users never reach these actions; unauthenticated and read_only fail.
 */
export async function requireScoutingWriteUser(): Promise<ScoutingAuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your session has expired. Please sign in again.",
    };
  }

  const { data: isAdmin, error } = await supabase.rpc("app_is_admin");
  if (error) {
    return { ok: false, error: "Could not verify permissions." };
  }
  if (!isAdmin) {
    return {
      ok: false,
      error: "Only coaches with write access can archive or restore opponents.",
    };
  }

  return { ok: true, userId: user.id };
}
