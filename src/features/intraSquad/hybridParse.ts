import { extractNaturalDate } from "./naturalDate";
import { isIsoCalendarDate } from "./dates";
import { interpretMatchEntry } from "./parseMatchText";
import {
  AI_PARSE_UNAVAILABLE,
  extractMatchWithOpenAi,
  type AiExtractFn,
  type AiMatchExtraction,
} from "./aiMatchExtract";
import { formatUnknownPlayerError, ROSTER_UNAVAILABLE_ERROR } from "./persistErrors";
import { parseScoreSets } from "./parseScore";
import { resolveMatchPlayers, type PlayerResolution } from "./resolvePlayers";
import { rosterPlayerFirstName } from "./roster";
import {
  PARSE_ERROR_HINT,
  type IntraSquadWeight,
  type MatchStatus,
  type RosterPlayer,
  type ScoreSet,
} from "./types";

export const HIGH_PARSE_CONFIDENCE = 0.8;

export type ValidatedQuickParse = {
  ok: true;
  source: "deterministic" | "ai";
  confidence: number;
  needsConfirmation: boolean;
  interpretation: string;
  status: MatchStatus;
  primary: RosterPlayer;
  opponent: RosterPlayer;
  scoreText: string;
  scoreSets: ScoreSet[];
  weight: IntraSquadWeight;
  weightFromText: boolean;
  playedAt: string;
  dateFromText: boolean;
  dateText: string | null;
  sourceText: string;
};

export type QuickParseFailure = {
  ok: false;
  error: string;
  status?: MatchStatus;
  ambiguous?: { winner: PlayerResolution; loser: PlayerResolution };
  aiAttempted?: boolean;
};

export type HybridParseResult = ValidatedQuickParse | QuickParseFailure;

function rosterNames(roster: readonly RosterPlayer[]): string[] {
  return roster.map((player) => rosterPlayerFirstName(player));
}

function shouldAttemptAi(error: string): boolean {
  return (
    error === PARSE_ERROR_HINT ||
    /Couldn’t determine/i.test(error) ||
    /Add the current score/i.test(error)
  );
}

export function validateAiExtraction(
  extraction: AiMatchExtraction,
  {
    roster,
    selectedDate,
    selectedWeight,
    sourceText,
    now = new Date(),
  }: {
    roster: readonly RosterPlayer[];
    selectedDate: string;
    selectedWeight: IntraSquadWeight;
    sourceText: string;
    now?: Date;
  },
): HybridParseResult {
  if (roster.length === 0) return { ok: false, error: ROSTER_UNAVAILABLE_ERROR, aiAttempted: true };

  const primaryName =
    extraction.status === "unfinished"
      ? extraction.leaderName || extraction.playerAName
      : extraction.winnerName || extraction.playerAName;
  const opponentName =
    extraction.status === "unfinished"
      ? extraction.trailingName || extraction.playerBName
      : extraction.loserName || extraction.playerBName;

  if (!primaryName || !opponentName) {
    return { ok: false, error: "Couldn’t determine both players.", aiAttempted: true };
  }

  const resolved = resolveMatchPlayers(primaryName, opponentName, roster);
  if (resolved.status === "unknown") {
    return { ok: false, error: formatUnknownPlayerError(resolved.token), aiAttempted: true };
  }
  if (resolved.status === "same-player") {
    return {
      ok: false,
      error:
        extraction.status === "unfinished"
          ? "Leader and trailing player must be different players."
          : "Winner and loser must be different players.",
      aiAttempted: true,
    };
  }
  if (resolved.status === "ambiguous") {
    return {
      ok: false,
      error: "That first name matches more than one roster player. Choose the correct player.",
      status: extraction.status,
      ambiguous: { winner: resolved.winner, loser: resolved.loser },
      aiAttempted: true,
    };
  }

  const parsedScore = parseScoreSets(extraction.score, {
    allowPartialSets: extraction.status === "unfinished",
  });
  if ("error" in parsedScore) {
    return { ok: false, error: parsedScore.error, status: extraction.status, aiAttempted: true };
  }

  let weight: IntraSquadWeight = selectedWeight;
  let weightFromText = false;
  if (extraction.weight === 1 || extraction.weight === 2 || extraction.weight === 3) {
    weight = extraction.weight;
    weightFromText = true;
  }

  let playedAt = selectedDate;
  let dateFromText = false;
  let dateText = extraction.dateText;
  if (extraction.dateText) {
    const resolvedDate = extractNaturalDate(extraction.dateText, now);
    if (resolvedDate.dateIso && isIsoCalendarDate(resolvedDate.dateIso)) {
      playedAt = resolvedDate.dateIso;
      dateFromText = true;
      dateText = extraction.dateText;
    } else if (isIsoCalendarDate(extraction.dateText)) {
      playedAt = extraction.dateText;
      dateFromText = true;
    } else {
      return { ok: false, error: "Couldn’t understand the match date.", aiAttempted: true };
    }
  }
  if (!isIsoCalendarDate(playedAt)) {
    return { ok: false, error: "Enter a valid match date.", aiAttempted: true };
  }

  return {
    ok: true,
    source: "ai",
    confidence: extraction.confidence,
    needsConfirmation: extraction.confidence < HIGH_PARSE_CONFIDENCE,
    interpretation: extraction.interpretation,
    status: extraction.status,
    primary: resolved.winner,
    opponent: resolved.loser,
    scoreText: parsedScore.scoreText,
    scoreSets: parsedScore.sets,
    weight,
    weightFromText,
    playedAt,
    dateFromText,
    dateText,
    sourceText,
  };
}

export async function hybridParseQuickMatch(input: {
  text: string;
  roster: readonly RosterPlayer[];
  selectedDate: string;
  selectedWeight: IntraSquadWeight;
  winnerPlayerId?: string;
  loserPlayerId?: string;
  now?: Date;
  aiExtract?: AiExtractFn;
  allowAi?: boolean;
}): Promise<HybridParseResult> {
  const now = input.now ?? new Date();
  const text = input.text.trim();
  if (!text) return { ok: false, error: "Enter a match result." };

  const deterministic = interpretMatchEntry(text, input.roster, {
    defaultWeight: input.selectedWeight,
    winnerPlayerId: input.winnerPlayerId,
    loserPlayerId: input.loserPlayerId,
    now,
  });

  if ("ok" in deterministic) {
    const playedAt =
      deterministic.dateFromText && deterministic.playedAt ? deterministic.playedAt : input.selectedDate;
    if (!isIsoCalendarDate(playedAt)) {
      return { ok: false, error: "Enter a valid match date." };
    }
    return {
      ok: true,
      source: "deterministic",
      confidence: deterministic.confidence,
      needsConfirmation: deterministic.confidence < HIGH_PARSE_CONFIDENCE,
      interpretation: deterministic.interpretation,
      status: deterministic.status,
      primary: deterministic.status === "unfinished" ? deterministic.leader : deterministic.winner,
      opponent: deterministic.status === "unfinished" ? deterministic.trailing : deterministic.loser,
      scoreText: deterministic.scoreText,
      scoreSets: deterministic.scoreSets,
      weight: deterministic.weight,
      weightFromText: deterministic.weightFromText,
      playedAt,
      dateFromText: deterministic.dateFromText,
      dateText: deterministic.dateText,
      sourceText: text,
    };
  }

  if (deterministic.ambiguous) {
    return {
      ok: false,
      error: deterministic.error,
      status: deterministic.status,
      ambiguous: deterministic.ambiguous,
    };
  }

  if (input.allowAi === false || !shouldAttemptAi(deterministic.error)) {
    return { ok: false, error: deterministic.error };
  }

  const aiExtract = input.aiExtract ?? ((args) => extractMatchWithOpenAi(args));
  const extraction = await aiExtract({
    text,
    rosterNames: rosterNames(input.roster),
    selectedDate: input.selectedDate,
    selectedWeight: input.selectedWeight,
  });
  if ("error" in extraction) {
    return {
      ok: false,
      error: extraction.error === AI_PARSE_UNAVAILABLE ? AI_PARSE_UNAVAILABLE : extraction.error,
      aiAttempted: true,
    };
  }

  return validateAiExtraction(extraction, {
    roster: input.roster,
    selectedDate: input.selectedDate,
    selectedWeight: input.selectedWeight,
    sourceText: text,
    now,
  });
}
