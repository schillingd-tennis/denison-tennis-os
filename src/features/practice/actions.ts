"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function addPracticeDayAction(date: string) {
  const slashMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const normalized = slashMatch ? `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}` : date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(new Date(`${normalized}T12:00:00Z`).getTime())) return { success: false, message: "Enter a date as MM/DD/YYYY." } as const;
  const client = await createSupabaseServerClient();
  const { error } = await client.from("practice_days").upsert({ practice_date: normalized }, { onConflict: "practice_date" });
  if (error) return { success: false, message: error.message } as const;
  revalidatePath("/"); revalidatePath("/team-operations/practice");
  return { success: true } as const;
}

export async function deletePracticeDayAction(id: string) {
  const client = await createSupabaseServerClient();
  const { error } = await client.from("practice_days").delete().eq("id", id);
  if (error) return { success: false, message: error.message } as const;
  revalidatePath("/"); revalidatePath("/team-operations/practice");
  return { success: true } as const;
}

function parseDrillTags(formData: FormData) {
  return String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function updatePracticeDrillAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { success: false, message: "A drill name is required." } as const;

  const tags = parseDrillTags(formData);
  const client = await createSupabaseServerClient();
  const { error } = await client.from("practice_drills").update({
    name,
    description: String(formData.get("description") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    source_tags: tags.join(","),
    tags,
    frequency: String(formData.get("frequency") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { success: false, message: error.message } as const;
  revalidatePath("/team-operations/practice");
  return { success: true } as const;
}

export async function createPracticeDrillAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, message: "A drill name is required." } as const;

  const tags = parseDrillTags(formData);
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const sourceTags = tags.join(",");
  const importKey = `custom:${crypto.randomUUID()}`;
  const client = await createSupabaseServerClient();
  const { error } = await client.from("practice_drills").insert({
    import_key: importKey,
    name,
    description,
    category,
    source_tags: sourceTags,
    tags,
    frequency,
    notes,
  });
  if (error) return { success: false, message: error.message } as const;
  revalidatePath("/team-operations/practice");
  return { success: true } as const;
}

export async function saveDailyPlanAction(formData: FormData) {
  const planDate = String(formData.get("planDate") ?? "");
  const title = String(formData.get("title") ?? "Team Practice").trim() || "Team Practice";
  const countable = formData.get("countable") === "on";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) return { success: false, message: "Choose a valid practice date." } as const;
  const client = await createSupabaseServerClient();
  const { data: plan, error } = await client.from("daily_practice_plans").upsert({
    plan_date: planDate, title, start_time: String(formData.get("startTime") ?? "") || null, end_time: String(formData.get("endTime") ?? "") || null,
    location: String(formData.get("location") ?? ""), announcements: String(formData.get("announcements") ?? ""), focus: String(formData.get("focus") ?? ""), countable, status: String(formData.get("status") ?? "draft"), updated_at: new Date().toISOString(),
  }, { onConflict: "plan_date" }).select("id").single();
  if (error || !plan) return { success: false, message: error?.message ?? "Could not save plan." } as const;
  const drillIds = formData.getAll("drillIds").map(String);
  const { error: clearError } = await client.from("practice_plan_drills").delete().eq("plan_id", plan.id);
  if (clearError) return { success: false, message: clearError.message } as const;
  if (drillIds.length) {
    const { error: drillError } = await client.from("practice_plan_drills").insert(drillIds.map((drillId, index) => ({ plan_id: plan.id, drill_id: drillId, sort_order: index })));
    if (drillError) return { success: false, message: drillError.message } as const;
  }
  if (countable) await client.from("practice_days").upsert({ practice_date: planDate, notes: `Daily plan: ${title}` }, { onConflict: "practice_date" });
  else await client.from("practice_days").delete().eq("practice_date", planDate).like("notes", "Daily plan:%");
  revalidatePath("/"); revalidatePath("/team-operations/practice");
  return { success: true } as const;
}
