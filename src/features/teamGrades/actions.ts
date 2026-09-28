"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TEAM_GRADES_ROUTE } from "@/lib/module-routes";

import { upsertAcademicRecords, upsertAcademicTerm } from "./repository";
import type { AcademicSeason } from "./types";

export async function saveAcademicGradesAction(input: {
  season: AcademicSeason;
  calendarYear: number;
  rows: Array<{ personId: string; creditHours: number; semesterGpa: number; midtermGpa: number | null }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "Sign in to manage academic grades." };
    const year = input.calendarYear;
    if (!Number.isInteger(year) || year < 2000 || year > 2200) return { ok: false, error: "Enter a valid year." };
    for (const row of input.rows) {
      if (!row.personId || row.creditHours < 0 || row.creditHours > 40 || row.semesterGpa < 0 || row.semesterGpa > 4 || (row.midtermGpa != null && (row.midtermGpa < 0 || row.midtermGpa > 4))) return { ok: false, error: "Hours and GPA values are outside the allowed range." };
    }
    const startYear = input.season === "fall" ? year : year - 1;
    const term = await upsertAcademicTerm({
      termKey: `${input.season === "fall" ? "f" : "s"}${year}`,
      label: `${input.season === "fall" ? "Fall" : "Spring"} ${year}`,
      season: input.season,
      calendarYear: year,
      academicYear: `${startYear}-${String(startYear + 1).slice(-2)}`,
      sortOrder: year * 2 + (input.season === "spring" ? 0 : 1),
    });
    await upsertAcademicRecords(term.id, input.rows);
    revalidatePath(TEAM_GRADES_ROUTE);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save academic grades." };
  }
}
