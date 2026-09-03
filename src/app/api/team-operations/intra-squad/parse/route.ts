import { NextResponse } from "next/server";

import { hybridParseQuickMatch } from "@/features/intraSquad/hybridParse";
import { isIntraSquadWeight } from "@/features/intraSquad/mapping";
import { peopleToRoster } from "@/features/intraSquad/peopleToRoster";
import { isIsoCalendarDate } from "@/features/intraSquad/dates";
import { listPeople } from "@/features/people/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ParseBody = {
  text?: unknown;
  selectedDate?: unknown;
  selectedWeight?: unknown;
  winnerPlayerId?: unknown;
  loserPlayerId?: unknown;
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
  const selectedDate = typeof body.selectedDate === "string" ? body.selectedDate.trim() : "";
  const selectedWeight = Number(body.selectedWeight);
  if (!isIsoCalendarDate(selectedDate)) {
    return NextResponse.json({ ok: false, error: "Enter a valid match date." }, { status: 400 });
  }
  if (!isIntraSquadWeight(selectedWeight)) {
    return NextResponse.json({ ok: false, error: "Weight must be 1, 2, or 3." }, { status: 400 });
  }

  try {
    const people = await listPeople();
    const roster = peopleToRoster(people);
    const result = await hybridParseQuickMatch({
      text,
      roster,
      selectedDate,
      selectedWeight,
      winnerPlayerId: typeof body.winnerPlayerId === "string" ? body.winnerPlayerId : undefined,
      loserPlayerId: typeof body.loserPlayerId === "string" ? body.loserPlayerId : undefined,
      allowAi: true,
    });

    if (!result.ok) {
      return NextResponse.json(result);
    }

    return NextResponse.json({
      ok: true,
      source: result.source,
      confidence: result.confidence,
      needsConfirmation: result.needsConfirmation,
      interpretation: result.interpretation,
      status: result.status,
      primaryPlayerId: result.primary.id,
      opponentPlayerId: result.opponent.id,
      primaryName: result.primary.firstName,
      opponentName: result.opponent.firstName,
      scoreText: result.scoreText,
      scoreSets: result.scoreSets,
      weight: result.weight,
      weightFromText: result.weightFromText,
      playedAt: result.playedAt,
      dateFromText: result.dateFromText,
      dateText: result.dateText,
      sourceText: result.sourceText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn’t parse match text.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
