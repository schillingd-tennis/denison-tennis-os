import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AcademicRecord, AcademicSeason, AcademicTerm } from "./types";

type TermRow = { id: string; term_key: string; label: string; season: AcademicSeason; calendar_year: number; academic_year: string; sort_order: number };
type RecordRow = { id: string; term_id: string; person_id: string; credit_hours: number | string; semester_gpa: number | string; midterm_gpa: number | string | null };

function mapTerm(row: TermRow): AcademicTerm {
  return { id: row.id, termKey: row.term_key, label: row.label, season: row.season, calendarYear: row.calendar_year, academicYear: row.academic_year, sortOrder: row.sort_order };
}
function mapRecord(row: RecordRow): AcademicRecord {
  return { id: row.id, termId: row.term_id, personId: row.person_id, creditHours: Number(row.credit_hours), semesterGpa: Number(row.semester_gpa), midtermGpa: row.midterm_gpa == null ? null : Number(row.midterm_gpa) };
}

export async function listAcademicTerms(): Promise<AcademicTerm[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("team_academic_terms").select("*").order("sort_order");
  if (error) throw new Error(`Could not load academic terms: ${error.message}`);
  return (data as TermRow[]).map(mapTerm);
}

export async function listAcademicRecords(): Promise<AcademicRecord[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("team_academic_records").select("*");
  if (error) throw new Error(`Could not load academic records: ${error.message}`);
  return (data as RecordRow[]).map(mapRecord);
}

export async function upsertAcademicTerm(input: Omit<AcademicTerm, "id">): Promise<AcademicTerm> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("team_academic_terms").upsert({ term_key: input.termKey, label: input.label, season: input.season, calendar_year: input.calendarYear, academic_year: input.academicYear, sort_order: input.sortOrder }, { onConflict: "term_key" }).select("*").single();
  if (error) throw new Error(`Could not save academic term: ${error.message}`);
  return mapTerm(data as TermRow);
}

export async function upsertAcademicRecords(termId: string, rows: Array<{ personId: string; creditHours: number; semesterGpa: number; midtermGpa: number | null }>): Promise<void> {
  if (!rows.length) return;
  const client = await createSupabaseServerClient();
  const { error } = await client.from("team_academic_records").upsert(rows.map((row) => ({ term_id: termId, person_id: row.personId, credit_hours: row.creditHours, semester_gpa: row.semesterGpa, midterm_gpa: row.midtermGpa, updated_at: new Date().toISOString() })), { onConflict: "term_id,person_id" });
  if (error) throw new Error(`Could not save academic records: ${error.message}`);
}
