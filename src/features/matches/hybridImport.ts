import {
  extractOfficialMatchWithOpenAi,
  type AiDualExtraction,
  type AiTournamentExtraction,
} from "./aiExtract";
import { detectMatchEventType, resolveForcedEventType } from "./detectEventType";
import { parseDualBoxScore } from "./dualParse";
import { parseScoreSets } from "./scoreParse";
import { rosterPlayerDisplayName, toDraftParticipant } from "./resolvePlayers";
import {
  calculateDualTeamScores,
  teamOutcomeFromScores,
} from "./scoringRules";
import { parseTournamentResults } from "./tournamentParse";
import type {
  DualDraftLineResult,
  DualImportDraft,
  MatchEventType,
  MatchResult,
  MatchesImportDraft,
  RosterPlayer,
  TournamentDraftResult,
  TournamentImportDraft,
} from "./types";
import { MATCHES_PARSE_UNAVAILABLE } from "./types";

export type HybridImportResult =
  | {
      ok: true;
      eventType: MatchEventType;
      needsUserChoice: boolean;
      source: "deterministic" | "ai" | "deterministic+ai";
      draft: MatchesImportDraft;
      detectionReasons: string[];
    }
  | {
      ok: false;
      needsUserChoice: boolean;
      error: string;
      detectionReasons: string[];
      preservedText: string;
    };

export async function hybridImportBoxScore(input: {
  text: string;
  roster: readonly RosterPlayer[];
  forcedType?: MatchEventType | "auto";
  seasonYear?: number | null;
  referenceDate?: string | null;
  allowAi?: boolean;
  extractFn?: typeof extractOfficialMatchWithOpenAi;
}): Promise<HybridImportResult> {
  const text = input.text.trim();
  const detection = detectMatchEventType(text);
  const forced = input.forcedType ?? "auto";
  const resolved = resolveForcedEventType(detection, forced);

  if (resolved.needsUserChoice || !resolved.eventType) {
    return {
      ok: false,
      needsUserChoice: true,
      error:
        "Couldn’t tell if this is a Dual or Individual Tournament. Choose one to continue — paste is preserved.",
      detectionReasons: detection.reasons,
      preservedText: text,
    };
  }

  const eventType = resolved.eventType;
  const deterministic =
    eventType === "dual"
      ? parseDualBoxScore({ text, roster: input.roster, seasonYear: input.seasonYear, referenceDate: input.referenceDate })
      : parseTournamentResults({ text, roster: input.roster, seasonYear: input.seasonYear, referenceDate: input.referenceDate });

  const deterministicUseful =
    eventType === "dual"
      ? (deterministic as DualImportDraft).results.length > 0
      : (deterministic as TournamentImportDraft).results.length > 0;

  // AI interprets varied pasted formats when configured. The deterministic
  // parser remains a fallback, rather than preventing the AI request.
  const canUseAi =
    input.allowAi !== false &&
    (input.extractFn !== undefined || Boolean(process.env.OPENAI_API_KEY?.trim()));
  if (!canUseAi) {
    return deterministicUseful
      ? {
          ok: true,
          eventType,
          needsUserChoice: false,
          source: "deterministic",
          draft: {
            ...deterministic,
            flags: [...deterministic.flags, "AI is not configured for this server; built-in parser used. Review every result."],
          },
          detectionReasons: detection.reasons,
        }
      : {
          ok: false,
          needsUserChoice: false,
          error: "AI is not configured for this server, and the built-in parser could not interpret the paste. Your text is preserved. Configure a server-side OpenAI API key or enter results manually.",
          detectionReasons: detection.reasons,
          preservedText: text,
        };
  }

  const extract = input.extractFn ?? extractOfficialMatchWithOpenAi;
  let ai: Awaited<ReturnType<typeof extract>>;
  try {
    ai = await extract({
      eventType,
      text,
      rosterNames: input.roster.map(rosterPlayerDisplayName),
    });
  } catch {
    ai = { error: MATCHES_PARSE_UNAVAILABLE };
  }

  if ("error" in ai || ai.results.length === 0 || (deterministicUseful && ai.results.length < deterministic.results.length)) {
    if (deterministicUseful) {
      return {
        ok: true,
        eventType,
        needsUserChoice: false,
        source: "deterministic",
        draft: {
          ...deterministic,
          flags: [...deterministic.flags, "AI interpretation unavailable or incomplete; built-in parser used. Review every result."],
        },
        detectionReasons: detection.reasons,
      };
    }
    return {
      ok: false,
      needsUserChoice: false,
      error: "error" in ai ? ai.error : MATCHES_PARSE_UNAVAILABLE,
      detectionReasons: detection.reasons,
      preservedText: text,
    };
  }

  const draft =
    eventType === "dual"
      ? mergeDualAi(deterministic as DualImportDraft, ai as AiDualExtraction, input.roster)
      : mergeTournamentAi(
          deterministic as TournamentImportDraft,
          ai as AiTournamentExtraction,
          input.roster,
        );

  return {
    ok: true,
    eventType,
    needsUserChoice: false,
    source: deterministicUseful ? "deterministic+ai" : "ai",
    draft,
    detectionReasons: detection.reasons,
  };
}

function mergeDualAi(
  base: DualImportDraft,
  ai: AiDualExtraction,
  roster: readonly RosterPlayer[],
): DualImportDraft {
  const results: DualDraftLineResult[] = ai.results.map((row) => {
    const parsedScore = row.score ? parseScoreSets(row.score) : { sets: [], scoreText: "" };
    const scoreSets = "sets" in parsedScore ? parsedScore.sets : [];
    const scoreText = "scoreText" in parsedScore ? parsedScore.scoreText : row.score;
    const flags: string[] = [];
    if ("error" in parsedScore && row.score) flags.push(parsedScore.error);
    const denisonA = toDraftParticipant(row.denisonPlayerName, roster);
    const denisonB = row.denisonPartnerName
      ? toDraftParticipant(row.denisonPartnerName, roster)
      : null;
    if (denisonA.resolution !== "resolved") flags.push(`Denison player needs review: ${denisonA.rawName}`);
    if (denisonB && denisonB.resolution !== "resolved") {
      flags.push(`Denison partner needs review: ${denisonB.rawName}`);
    }
    return {
      discipline: row.discipline,
      lineupPosition: row.lineupPosition,
      denisonA,
      denisonB,
      opponentAName: row.opponentPlayerName,
      opponentBName: row.opponentPartnerName,
      opponentSchool: row.opponentSchool,
      status: row.status,
      winnerSide: row.winnerSide,
      scoreText,
      scoreSets,
      originalScoreText: row.score,
      sourceExcerpt: row.sourceExcerpt || row.denisonPlayerName,
      countsTowardTeamPoint: row.status !== "bye" && row.status !== "cancelled",
      teamPointAwardedTo:
        row.status === "unfinished" || row.status === "bye" || row.status === "cancelled"
          ? "none"
          : row.winnerSide === "denison"
            ? "denison"
            : row.winnerSide === "opponent"
              ? "opponent"
              : null,
      flags,
    };
  });

  const synthetic: MatchResult[] = results.map((r, index) => ({
    id: `ai-${index}`,
    eventId: "draft",
    discipline: r.discipline,
    resultKind: "dual_lineup",
    lineupPosition: r.lineupPosition,
    drawName: null,
    flightName: null,
    divisionName: null,
    roundLabel: null,
    matchDate: ai.startDate ?? base.startDate,
    status: r.status,
    winnerSide: r.winnerSide,
    scoreText: r.scoreText,
    scoreSets: r.scoreSets,
    originalScoreText: r.originalScoreText,
    sourceExcerpt: r.sourceExcerpt,
    notes: null,
    denisonPlayerAId: r.denisonA.personId,
    denisonPlayerBId: r.denisonB?.personId ?? null,
    doublesPairId: null,
    opponentPlayerAName: r.opponentAName,
    opponentPlayerBName: r.opponentBName,
    opponentSchool: r.opponentSchool,
    countsTowardTeamPoint: r.countsTowardTeamPoint,
    teamPointAwardedTo: r.teamPointAwardedTo,
    importFingerprint: null,
    createdAt: "",
    updatedAt: "",
  }));

  const scoringFormat = ai.scoringFormat || base.scoringFormat;
  const calculated = calculateDualTeamScores(synthetic, scoringFormat);
  const reportedDenison = ai.reportedTeamScoreDenison ?? base.reportedTeamScoreDenison;
  const reportedOpponent = ai.reportedTeamScoreOpponent ?? base.reportedTeamScoreOpponent;
  const discrepancy =
    reportedDenison != null &&
    reportedOpponent != null &&
    (reportedDenison !== calculated.denison || reportedOpponent !== calculated.opponent);

  return {
    kind: "dual",
    opposingTeamName: ai.opposingTeamName ?? base.opposingTeamName,
    seasonYear: base.seasonYear,
    seasonSegment: base.seasonSegment,
    startDate: ai.startDate ?? base.startDate,
    site: ai.site ?? base.site,
    locationText: ai.locationText ?? base.locationText,
    venueName: base.venueName,
    scoringFormat,
    reportedTeamScoreDenison: reportedDenison,
    reportedTeamScoreOpponent: reportedOpponent,
    calculatedTeamScoreDenison: calculated.denison,
    calculatedTeamScoreOpponent: calculated.opponent,
    teamOutcome: teamOutcomeFromScores(
      reportedDenison ?? calculated.denison,
      reportedOpponent ?? calculated.opponent,
    ),
    teamScoreDiscrepancy: Boolean(discrepancy),
    results,
    confidence: ai.confidence,
    interpretation: ai.interpretation,
    flags: [
      ...new Set([
        ...(discrepancy
          ? [
              `Reported team score ${reportedDenison}–${reportedOpponent} differs from calculated ${calculated.denison}–${calculated.opponent}`,
            ]
          : []),
        ...results.flatMap((r) => r.flags),
      ]),
    ],
  };
}

function mergeTournamentAi(
  base: TournamentImportDraft,
  ai: AiTournamentExtraction,
  roster: readonly RosterPlayer[],
): TournamentImportDraft {
  const results: TournamentDraftResult[] = ai.results.map((row) => {
    const parsedScore = row.score ? parseScoreSets(row.score) : { sets: [], scoreText: "" };
    const scoreSets = "sets" in parsedScore ? parsedScore.sets : [];
    const scoreText = "scoreText" in parsedScore ? parsedScore.scoreText : row.score;
    const flags: string[] = [];
    if ("error" in parsedScore && row.score) flags.push(parsedScore.error);
    const denisonA = toDraftParticipant(row.denisonPlayerName, roster);
    const denisonB = row.denisonPartnerName
      ? toDraftParticipant(row.denisonPartnerName, roster)
      : null;
    if (denisonA.resolution !== "resolved") flags.push(`Denison player needs review: ${denisonA.rawName}`);
    if (denisonB && denisonB.resolution !== "resolved") {
      flags.push(`Denison partner needs review: ${denisonB.rawName}`);
    }
    return {
      discipline: row.discipline,
      drawName: row.drawName,
      flightName: row.flightName,
      divisionName: null,
      roundLabel: row.roundLabel,
      matchDate: row.matchDate ?? ai.startDate ?? base.startDate,
      denisonA,
      denisonB,
      opponentAName: row.opponentPlayerName,
      opponentBName: row.opponentPartnerName,
      opponentSchool: row.opponentSchool,
      status: row.status,
      winnerSide: row.winnerSide,
      scoreText,
      scoreSets,
      originalScoreText: row.score,
      sourceExcerpt: row.sourceExcerpt || row.denisonPlayerName,
      flags,
    };
  });

  return {
    kind: "tournament",
    title: ai.title ?? base.title,
    seasonYear: base.seasonYear,
    seasonSegment: base.seasonSegment,
    startDate: ai.startDate ?? base.startDate,
    endDate: ai.endDate ?? base.endDate,
    locationText: ai.locationText ?? base.locationText,
    results,
    confidence: ai.confidence,
    interpretation: ai.interpretation,
    flags: [...new Set(results.flatMap((r) => r.flags))],
  };
}
