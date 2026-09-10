import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OfficialWritePayload } from "./formData";
import { mapOfficialRow, type OfficialRow } from "./mapOfficial";
import type { Official } from "./types";

function missingTable(message: string) {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

export { mapOfficialRow } from "./mapOfficial";

export async function listOfficials(): Promise<Official[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("knowledge_officials").select("*").order("name");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load officials: ${error.message}`);
  }
  return ((data as OfficialRow[] | null) ?? []).map(mapOfficialRow);
}

export async function getOfficial(id: string): Promise<Official | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("knowledge_officials").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load official: ${error.message}`);
  if (!data) return null;
  return mapOfficialRow(data as OfficialRow);
}

/** Create or update by canonical id. Awaits DB mutation and returns the persisted row. */
export async function saveOfficial(id: string | null, payload: OfficialWritePayload): Promise<Official> {
  const client = await createSupabaseServerClient();
  const row = { ...payload, updated_at: new Date().toISOString() };
  const query = id
    ? client.from("knowledge_officials").update(row).eq("id", id).select("*").single()
    : client.from("knowledge_officials").insert(row).select("*").single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Official save did not return a record.");
  return mapOfficialRow(data as OfficialRow);
}
