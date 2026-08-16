"use server";

/**
 * Person mutation Server Actions (BP-017 Phase 1).
 *
 * This is the only bridge Client Components have to `updatePerson` —
 * per `docs/ARCHITECTURE.md` §9, React components must never call Supabase
 * or the repository directly. Re-checks authentication itself (defense in
 * depth alongside `src/proxy.ts`) so a friendly error is returned instead
 * of a raw RLS rejection if a session has expired mid-edit.
 */
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PeopleRepositoryError, updatePerson } from "./repository";
import type { Person, PersonWritePatch } from "./types";

export type UpdatePersonResult = { success: true; person: Person } | { success: false; error: string };

export async function updatePersonAction(id: string, patch: PersonWritePatch): Promise<UpdatePersonResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Your session has expired. Please sign in again to save changes." };
  }

  try {
    const person = await updatePerson(id, patch);
    revalidatePath(`/team/${id}`);
    revalidatePath("/team");
    revalidatePath(`/recruiting/${id}`);
    revalidatePath("/recruiting");
    return { success: true, person };
  } catch (error) {
    if (error instanceof PeopleRepositoryError) {
      console.error(`[updatePersonAction] ${error.message}`);
    } else {
      console.error("[updatePersonAction] Unexpected error", error);
    }

    return { success: false, error: "We couldn't save your changes. Please try again." };
  }
}
