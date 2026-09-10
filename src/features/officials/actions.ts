"use server";

import { revalidatePath } from "next/cache";
import { normalizeEmail } from "@/components/inline-edit/formatters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KNOWLEDGE_OFFICIALS_ROUTE } from "@/lib/module-routes";
import { readOfficialFormData } from "./formData";
import { saveOfficial } from "./repository";

export async function saveOfficialAction(formData: FormData) {
  const parsed = readOfficialFormData(formData, normalizeEmail);
  if (!parsed.ok) return { success: false, message: parsed.message } as const;

  try {
    const official = await saveOfficial(parsed.id, parsed.payload);
    revalidatePath(KNOWLEDGE_OFFICIALS_ROUTE);
    revalidatePath("/knowledge");
    return { success: true, official } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not save official.",
    } as const;
  }
}

const INLINE_COLUMNS = {
  name: "name",
  email: "email",
  phone: "phone",
  city: "city",
  state: "state",
  rate: "rate",
  ranking: "ranking",
  notes: "notes",
  assignorArea: "assignor_area",
} as const;

export async function updateOfficialFieldAction(id: string, field: keyof typeof INLINE_COLUMNS, raw: string) {
  if (!id || !(field in INLINE_COLUMNS)) return { success: false, message: "Invalid official field." } as const;

  let value: string | number | null = raw.trim() || null;
  if (field === "name") {
    if (!raw.trim()) return { success: false, message: "Official name is required." } as const;
    value = raw.trim();
  }
  if (field === "email") value = normalizeEmail(raw) ?? null;
  if (field === "state" && value) value = String(value).toUpperCase();
  if (field === "ranking") {
    if (!raw.trim()) value = null;
    else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        return { success: false, message: "Ranking must be a whole number from 1 to 5." } as const;
      }
      value = parsed;
    }
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("knowledge_officials")
    .update({ [INLINE_COLUMNS[field]]: value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  if (error) return { success: false, message: error.message } as const;
  if (!data) return { success: false, message: "Official was not updated." } as const;
  revalidatePath(KNOWLEDGE_OFFICIALS_ROUTE);
  return { success: true, value } as const;
}
