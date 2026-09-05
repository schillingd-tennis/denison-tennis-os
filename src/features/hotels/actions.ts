"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function saveHotelAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  if (!name || !city || !state) return { success: false, message: "Hotel name, city, and state are required." } as const;
  const teamValue = String(formData.get("teamFriendly") ?? "");
  const payload = {
    name, city, state, chain: String(formData.get("chain") ?? "").trim() || null,
    rating: optionalNumber(formData.get("rating")), address: String(formData.get("address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null, price_range: String(formData.get("priceRange") ?? "").trim() || null,
    team_friendly: teamValue === "" ? null : teamValue === "true", dog_entry_rating: optionalNumber(formData.get("dogEntryRating")),
    year_stayed: String(formData.get("yearStayed") ?? "").trim() || null, updated_at: new Date().toISOString(),
  };
  const client = await createSupabaseServerClient();
  const result = id ? await client.from("knowledge_hotels").update(payload).eq("id", id) : await client.from("knowledge_hotels").insert(payload);
  if (result.error) return { success: false, message: result.error.message } as const;
  revalidatePath("/knowledge/hotels");
  return { success: true } as const;
}

const INLINE_COLUMNS = {
  name: "name", chain: "chain", city: "city", state: "state", rating: "rating", address: "address",
  dogEntryRating: "dog_entry_rating", yearStayed: "year_stayed", priceRange: "price_range", notes: "notes", teamFriendly: "team_friendly",
} as const;

export async function updateHotelFieldAction(id: string, field: keyof typeof INLINE_COLUMNS, raw: string) {
  if (!id || !(field in INLINE_COLUMNS)) return { success: false, message: "Invalid hotel field." } as const;
  let value: string | number | boolean | null = raw.trim() || null;
  if (field === "name" || field === "city" || field === "state") {
    if (!raw.trim()) return { success: false, message: `${field === "name" ? "Hotel name" : field} is required.` } as const;
    value = field === "state" ? raw.trim().toUpperCase() : raw.trim();
  }
  if (field === "rating" || field === "dogEntryRating") {
    if (!raw.trim()) value = null;
    else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return { success: false, message: "Rating must be a whole number from 1 to 5." } as const;
      value = parsed;
    }
  }
  if (field === "teamFriendly") value = raw === "" ? null : raw === "true";
  const client = await createSupabaseServerClient();
  const { error } = await client.from("knowledge_hotels").update({ [INLINE_COLUMNS[field]]: value, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, message: error.message } as const;
  revalidatePath("/knowledge/hotels");
  return { success: true, value } as const;
}
