import { NextResponse } from "next/server";

import {
  normalizeUtrApiResults,
  type UtrApiResultsPayload,
} from "@/features/recruiting/todayBeta/normalizeUtrCapture";
import {
  saveUtrCapturedResults,
  ensureTodayBetaTestPlayers,
  TodayBetaRepositoryError,
} from "@/features/recruiting/todayBeta/repository";
import {
  listUtrConfiguredMonitoredRecruits,
  isAllowedUtrPlayerId,
} from "@/features/recruiting/todayBeta/monitoringCohort";
import type { UtrCapturedMatch } from "@/features/recruiting/todayBeta/types";
import {
  UTR_EXTENSION_HEADER,
  UTR_EXTENSION_HEADER_VALUE,
  utrCaptureErrorMessage,
  type UtrCaptureErrorCode,
} from "@/features/recruiting/todayBeta/utrCaptureErrors";
import { listPeople } from "@/features/people/repository";
import { getDisplayName } from "@/features/people/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function isExtensionRequest(request: Request): boolean {
  return (
    request.headers.get(UTR_EXTENSION_HEADER) === UTR_EXTENSION_HEADER_VALUE
  );
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const fromExtension = isExtensionRequest(request);

  if (fromExtension) {
    return {
      "Access-Control-Allow-Origin": origin ?? "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": `Content-Type, ${UTR_EXTENSION_HEADER}`,
      "Access-Control-Allow-Credentials": "true",
    };
  }

  const allowed =
    origin &&
    (LOCAL_ORIGINS.includes(origin) ||
      origin.endsWith(".utrsports.net") ||
      origin.includes("utrsports.net"));

  return {
    "Access-Control-Allow-Origin": allowed ? origin : LOCAL_ORIGINS[0]!,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, ${UTR_EXTENSION_HEADER}`,
    "Access-Control-Allow-Credentials": "true",
  };
}

function errorResponse(
  request: Request,
  code: UtrCaptureErrorCode,
  status: number,
  detail?: string,
) {
  const message = detail
    ? `${utrCaptureErrorMessage(code)} (${detail})`
    : utrCaptureErrorMessage(code);
  return NextResponse.json(
    { success: false, code, error: message },
    { status, headers: corsHeaders(request) },
  );
}

type CaptureBody = {
  utrPlayerId: string;
  recruitPersonId?: string;
  sourceUrl?: string;
  payload?: UtrApiResultsPayload;
  matches?: Array<Record<string, unknown>>;
};

async function resolveRecruitPersonId(input: {
  utrPlayerId: string;
  recruitPersonId?: string;
}): Promise<{ recruitPersonId: string; recruitName: string } | null> {
  const monitored = await listUtrConfiguredMonitoredRecruits();
  const normalizedUtrId = input.utrPlayerId.trim();

  if (input.recruitPersonId?.trim()) {
    const match = monitored.find(
      (recruit) =>
        recruit.personId === input.recruitPersonId &&
        recruit.utrPlayerId === normalizedUtrId,
    );
    if (match) {
      return { recruitPersonId: match.personId, recruitName: match.displayName };
    }
  }

  const byUtr = monitored.find((recruit) => recruit.utrPlayerId === normalizedUtrId);
  if (byUtr) {
    return { recruitPersonId: byUtr.personId, recruitName: byUtr.displayName };
  }

  const people = await listPeople();
  for (const recruit of monitored) {
    if (recruit.utrPlayerId !== normalizedUtrId) continue;
    const person = people.find((row) => row.id === recruit.personId);
    if (person) {
      return { recruitPersonId: person.id, recruitName: getDisplayName(person) };
    }
  }

  return null;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  const fromExtension = isExtensionRequest(request);

  if (fromExtension) {
    const origin = request.headers.get("origin");
    if (
      origin &&
      !LOCAL_ORIGINS.includes(origin) &&
      !origin.startsWith("safari-web-extension://") &&
      !origin.startsWith("chrome-extension://")
    ) {
      return errorResponse(request, "IMPORT_FAILED", 403, "origin not allowed");
    }
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(request, "DENISON_NOT_SIGNED_IN", 401);
    }

    const body = (await request.json()) as CaptureBody;
    const utrPlayerId = body.utrPlayerId?.trim();
    if (!utrPlayerId) {
      return errorResponse(request, "PARSE_FAILED", 400, "UTR player id required");
    }

    await ensureTodayBetaTestPlayers();

    const monitored = await listUtrConfiguredMonitoredRecruits();
    if (!isAllowedUtrPlayerId(utrPlayerId, monitored)) {
      return errorResponse(request, "WRONG_UTR_PROFILE", 403);
    }

    const recruit = await resolveRecruitPersonId({
      utrPlayerId,
      recruitPersonId: body.recruitPersonId,
    });

    if (!recruit) {
      return errorResponse(request, "NO_RECRUIT_MATCH", 404);
    }

    let matches: UtrCapturedMatch[];
    if (body.payload) {
      try {
        matches = normalizeUtrApiResults({
          payload: body.payload,
          recruitPersonId: recruit.recruitPersonId,
          utrPlayerId,
          recruitName: recruit.recruitName,
        }).map((row) => ({
          source: "UTR" as const,
          recruitName: row.recruitName,
          utrPlayerId: row.utrPlayerId,
          tournamentName: row.tournamentName,
          matchDate: row.matchDate,
          round: row.round,
          opponentName: row.opponentName,
          recruitUtr: row.recruitUtr,
          opponentUtr: row.opponentUtr,
          score: row.score,
          result: row.result,
          matchStatus: row.matchStatus,
          externalMatchId: row.externalMatchId,
          tournamentUrl: row.tournamentUrl,
          needsReview: row.needsReview,
          parseWarnings: row.warnings,
        }));
      } catch {
        return errorResponse(request, "PARSE_FAILED", 422);
      }
    } else if (Array.isArray(body.matches) && body.matches.length > 0) {
      matches = body.matches as UtrCapturedMatch[];
    } else {
      return errorResponse(request, "PARSE_FAILED", 400, "no payload");
    }

    const outcome = await saveUtrCapturedResults({
      recruitPersonId: recruit.recruitPersonId,
      utrPlayerId,
      sourceUrl: body.sourceUrl,
      matches,
    });

    return NextResponse.json(
      {
        success: true,
        recruitPersonId: recruit.recruitPersonId,
        recruitName: recruit.recruitName,
        outcome,
      },
      { headers },
    );
  } catch (error) {
    const message =
      error instanceof TodayBetaRepositoryError
        ? error.message
        : "UTR capture import failed.";
    return NextResponse.json(
      { success: false, code: "IMPORT_FAILED" as const, error: message },
      { status: 500, headers },
    );
  }
}
