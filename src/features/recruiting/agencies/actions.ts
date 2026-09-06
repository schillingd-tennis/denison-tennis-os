"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveAgencyAction(form: FormData) {
  const id = text(form, "id"); const name = text(form, "name");
  if (!name) return { success: false, message: "Agency name is required." } as const;
  const payload = { name, city: text(form, "city") || null, state: text(form, "state").toUpperCase() || null, website: text(form, "website") || null, phone: text(form, "phone") || null, status: text(form, "status") || null, notes: text(form, "notes") || null, updated_at: new Date().toISOString() };
  const client = await createSupabaseServerClient();
  const result = id ? await client.from("recruiting_agencies").update(payload).eq("id", id) : await client.from("recruiting_agencies").insert(payload);
  if (result.error) return { success: false, message: result.error.message } as const;
  revalidatePath("/recruiting/agencies"); return { success: true } as const;
}

export async function saveAgentAction(form: FormData) {
  const id = text(form, "id"), agencyId = text(form, "agencyId"), firstName = text(form, "firstName"), lastName = text(form, "lastName");
  if (!agencyId || !firstName || !lastName) return { success: false, message: "Agency, first name, and last name are required." } as const;
  const payload = { agency_id: agencyId, first_name: firstName, last_name: lastName, title: text(form, "title") || null, email: text(form, "email") || null, phone: text(form, "phone") || null, city: text(form, "city") || null, state: text(form, "state").toUpperCase() || null, status: text(form, "status") || null, notes: text(form, "notes") || null, updated_at: new Date().toISOString() };
  const client = await createSupabaseServerClient();
  const result = id ? await client.from("recruiting_agents").update(payload).eq("id", id) : await client.from("recruiting_agents").insert(payload);
  if (result.error) return { success: false, message: result.error.message } as const;
  revalidatePath("/recruiting/agencies"); return { success: true } as const;
}

export async function deleteAgentAction(id: string) {
  if (!id) return { success: false, message: "Agent is required." } as const;
  const client = await createSupabaseServerClient();
  const { error } = await client.from("recruiting_agents").delete().eq("id", id);
  if (error) return { success: false, message: error.message } as const;
  revalidatePath("/recruiting/agencies");
  return { success: true } as const;
}

export async function deleteAgencyAction(id: string) {
  if (!id) return { success: false, message: "Agency is required." } as const;
  const client = await createSupabaseServerClient();
  const { error: agentsError } = await client.from("recruiting_agents").delete().eq("agency_id", id);
  if (agentsError) return { success: false, message: `Could not delete attached agents: ${agentsError.message}` } as const;
  const { error } = await client.from("recruiting_agencies").delete().eq("id", id);
  if (error) return { success: false, message: error.message } as const;
  revalidatePath("/recruiting/agencies");
  return { success: true } as const;
}
