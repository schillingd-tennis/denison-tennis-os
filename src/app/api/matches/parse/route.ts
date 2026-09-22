import { NextResponse } from "next/server";

import { hybridImportBoxScore } from "@/features/matches/hybridImport";
import { peopleToMatchesRoster } from "@/features/matches/loadWorkspace";
import type { MatchEventType } from "@/features/matches/types";
import { listPeople } from "@/features/people/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ParseBody = {
  text?: unknown;
  forcedType?: unknown;
  seasonYear?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to parse match text." }, { status: 401 });
  }

  let body: ParseBody;
  try {
    body = (await request.json()) as ParseBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const forcedType =
    body.forcedType === "dual" || body.forcedType === "tournament" || body.forcedType === "auto"
      ? (body.forcedType as MatchEventType | "auto")
      : "auto";
  const seasonYear =
    typeof body.seasonYear === "number"
      ? body.seasonYear
      : typeof body.seasonYear === "string" && body.seasonYear
        ? Number(body.seasonYear)
        : null;

  try {
    const people = await listPeople();
    const roster = peopleToMatchesRoster(people);
    const result = await hybridImportBoxScore({
      text,
      roster,
      forcedType,
      seasonYear,
      allowAi: Boolean(process.env.OPENAI_API_KEY?.trim()),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn’t parse match text.";
    return NextResponse.json({ ok: false, error: message, preservedText: text }, { status: 500 });
  }
}
