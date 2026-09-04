import { createSupabaseServerClient } from "@/lib/supabase/server";

import { calculateDayRule } from "./dayRule";
import type { DailyPracticePlan, DayRuleSummary, PracticeCompetitionDate, PracticeDay, PracticeDrill } from "./types";

type DrillRow = {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  source_tags: string | null;
  category: string | null;
  notes: string | null;
  frequency: string | null;
};

function missingTable(message: string): boolean {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

export async function listPracticeDrills(): Promise<PracticeDrill[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("practice_drills").select("*").order("name");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load drill library: ${error.message}`);
  }
  return ((data as DrillRow[] | null) ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    tags: row.tags ?? [],
    sourceTags: row.source_tags ?? "",
    category: row.category ?? "",
    notes: row.notes ?? "",
    frequency: row.frequency ?? "",
  }));
}

export async function listPracticeDays(): Promise<PracticeDay[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("practice_days").select("id,practice_date,notes").order("practice_date");
  if (error) { if (missingTable(error.message)) return []; throw new Error(`Failed to load practice days: ${error.message}`); }
  return (data ?? []).map((row) => ({ id: String(row.id), date: row.practice_date, notes: row.notes ?? "" }));
}

export async function getDayRuleSummary(): Promise<DayRuleSummary> {
  const client = await createSupabaseServerClient();
  const [{ data: practice, error: practiceError }, { data: events, error: eventsError }] = await Promise.all([
    client.from("practice_days").select("practice_date,notes"),
    client.from("team_schedule_events").select("start_date,end_date,opponent_name,event_name").eq("counts_as_competition_date", true).neq("status", "cancelled"),
  ]);
  if (practiceError && !missingTable(practiceError.message)) throw new Error(`Failed to load practice days: ${practiceError.message}`);
  if (eventsError && !missingTable(eventsError.message)) throw new Error(`Failed to load competition days: ${eventsError.message}`);
  return calculateDayRule((practice ?? []).map((row) => ({ date: row.practice_date, label: row.notes ?? "Team practice" })), (events ?? []).map((row) => ({ start: row.start_date, end: row.end_date, label: row.opponent_name ?? row.event_name ?? "Competition" })));
}

export async function listDailyPracticePlans(): Promise<DailyPracticePlan[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("daily_practice_plans").select("*, practice_plan_drills(sort_order, practice_drills(*))").order("plan_date", { ascending: false });
  if (error) { if (missingTable(error.message)) return []; throw new Error(`Failed to load daily plans: ${error.message}`); }
  return (data ?? []).map((row) => ({
    id: String(row.id), planDate: row.plan_date, title: row.title, startTime: row.start_time?.slice(0, 5) ?? "", endTime: row.end_time?.slice(0, 5) ?? "",
    location: row.location ?? "", announcements: row.announcements ?? "", focus: row.focus ?? "", countable: Boolean(row.countable), status: row.status,
    drills: (row.practice_plan_drills ?? []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order).map((item: { practice_drills: DrillRow }) => {
      const drill = item.practice_drills; return { id: drill.id, name: drill.name, description: drill.description ?? "", tags: drill.tags ?? [], sourceTags: drill.source_tags ?? "", category: drill.category ?? "", notes: drill.notes ?? "", frequency: drill.frequency ?? "" };
    }),
  }));
}

export async function listPracticeCompetitionDates(): Promise<PracticeCompetitionDate[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("team_schedule_events")
    .select("id,competition_date_number,competition_date_group,start_date,opponent_name,event_name,location_text,status")
    .eq("counts_as_competition_date", true)
    .order("start_date")
    .order("sort_order");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load competition dates: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    dateNumber: row.competition_date_number,
    dateGroup: row.competition_date_group,
    date: row.start_date,
    label: row.opponent_name ?? row.event_name ?? "Competition",
    location: row.location_text ?? "TBD",
    status: row.status,
  }));
}
