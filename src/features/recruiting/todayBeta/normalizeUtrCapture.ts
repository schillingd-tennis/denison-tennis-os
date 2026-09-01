/**
 * Normalize UTR API / capture payloads into Today Beta import rows.
 */
import {
  findCrossSourceMatch,
  formatUtrRating,
  normalizeOpponentName,
  outcomeFromUtrIsWinner,
} from "./crossSourceMatch";
import { isWalkoverOrDefaultStatus, reconstructUtrScore, type UtrSetScore } from "./reconstructUtrScore";
import type { MatchResultOutcome, UtrCapturedMatch } from "./types";
import { buildUtrEventUrl } from "./tournamentLink";
import { normalizeTrnTournamentDate } from "./tournamentDate";

export type UtrApiPlayer = {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  singlesUtr?: number | string;
  displayName?: string;
};

export type UtrApiMatch = {
  id?: number | string;
  date?: string;
  round?: { code?: string; name?: string } | null;
  players?: {
    winner1?: UtrApiPlayer | null;
    loser1?: UtrApiPlayer | null;
    winner2?: UtrApiPlayer | null;
    loser2?: UtrApiPlayer | null;
  };
  /** Live UTR API: per-side set games from winner/loser perspective. */
  winner?: {
    set1?: number | null;
    set2?: number | null;
    set3?: number | null;
    tiebreakerSet1?: number | null;
    tiebreakerSet2?: number | null;
    tiebreakerSet3?: number | null;
  } | null;
  loser?: {
    set1?: number | null;
    set2?: number | null;
    set3?: number | null;
    tiebreakerSet1?: number | null;
    tiebreakerSet2?: number | null;
    tiebreakerSet3?: number | null;
  } | null;
  /** Live UTR API: structured score by set number. */
  score?: Record<
    string,
    {
      winner?: number | null;
      loser?: number | null;
      tiebreak?: number | null;
      winnerTiebreak?: number | null;
    }
  > | null;
  sets?: Record<
    string,
    { winnerSet?: number; loserSet?: number; tiebreakerSet?: number | null }
  >;
  winnerSet1?: number | null;
  loserSet1?: number | null;
  winnerSet2?: number | null;
  loserSet2?: number | null;
  winnerSet3?: number | null;
  loserSet3?: number | null;
  tiebreakerSet1?: number | null;
  tiebreakerSet2?: number | null;
  tiebreakerSet3?: number | null;
  isWinner?: boolean;
  matchOutcome?: string | null;
  outcome?: string | null;
  completionType?: string | null;
  sourceType?: string | null;
};

export type UtrApiEvent = {
  id?: number | string;
  name?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  results?: UtrApiMatch[] | null;
  draws?: Array<{ id?: number | string; results?: UtrApiMatch[] | null }> | null;
};

export type UtrApiResultsPayload = {
  events?: UtrApiEvent[] | null;
  wins?: number;
  losses?: number;
};

export type NormalizedUtrImportRow = {
  source: "UTR";
  recruitName: string;
  utrPlayerId: string;
  tournamentName: string;
  matchDate: string;
  round: string;
  opponentName: string;
  recruitUtr?: string;
  opponentUtr?: string;
  score: string;
  result: MatchResultOutcome;
  matchStatus?: string;
  externalMatchId?: string;
  tournamentUrl?: string;
  needsReview: boolean;
  warnings: string[];
};

function playerDisplayName(player: UtrApiPlayer | null | undefined): string {
  if (!player) return "UNKNOWN";
  if (player.displayName?.trim()) return player.displayName.trim();
  const parts = [player.firstName, player.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "UNKNOWN";
}

function extractSetsForRecruit(
  match: UtrApiMatch,
  recruitIsWinner: boolean,
): UtrSetScore[] {
  const fromScoreObject = extractSetsFromScoreObject(match, recruitIsWinner);
  if (fromScoreObject.length > 0) {
    return fromScoreObject;
  }

  const sets: UtrSetScore[] = [];

  for (let index = 1; index <= 3; index += 1) {
    const setKey = String(index);
    const fromSetsObject = match.sets?.[setKey];
    const winnerGames =
      fromSetsObject?.winnerSet ??
      match[`winnerSet${index}` as keyof UtrApiMatch] ??
      null;
    const loserGames =
      fromSetsObject?.loserSet ??
      match[`loserSet${index}` as keyof UtrApiMatch] ??
      null;
    const tiebreak =
      fromSetsObject?.tiebreakerSet ??
      match[`tiebreakerSet${index}` as keyof UtrApiMatch] ??
      null;

    if (winnerGames == null || loserGames == null) continue;

    const winner = Number(winnerGames);
    const loser = Number(loserGames);
    if (!Number.isFinite(winner) || !Number.isFinite(loser)) continue;
    if (winner === 0 && loser === 0) continue;

    const recruitGames = recruitIsWinner ? winner : loser;
    const opponentGames = recruitIsWinner ? loser : winner;
    const tiebreakPoints =
      tiebreak != null && Number.isFinite(Number(tiebreak)) ? Number(tiebreak) : null;

    const isMatchTiebreak =
      index === 3 &&
      ((winner >= 10 && winner - loser >= 2) || (loser >= 10 && loser - winner >= 2));

    sets.push({
      recruitGames,
      opponentGames,
      tiebreakPoints,
      isMatchTiebreak,
    });
  }

  return sets;
}

function extractSetsFromScoreObject(
  match: UtrApiMatch,
  recruitIsWinner: boolean,
): UtrSetScore[] {
  const scoreObject = match.score;
  if (!scoreObject || typeof scoreObject !== "object") return [];

  const setKeys = Object.keys(scoreObject).sort(
    (left, right) => Number(left) - Number(right),
  );
  const sets: UtrSetScore[] = [];

  for (const setKey of setKeys) {
    const setRow = scoreObject[setKey];
    if (!setRow || typeof setRow !== "object") continue;

    const winnerGames = Number(setRow.winner);
    const loserGames = Number(setRow.loser);
    if (!Number.isFinite(winnerGames) || !Number.isFinite(loserGames)) continue;

    const loserTiebreak =
      setRow.tiebreak != null && Number.isFinite(Number(setRow.tiebreak))
        ? Number(setRow.tiebreak)
        : null;
    const winnerTiebreak =
      setRow.winnerTiebreak != null && Number.isFinite(Number(setRow.winnerTiebreak))
        ? Number(setRow.winnerTiebreak)
        : null;

    if (
      winnerTiebreak != null &&
      winnerTiebreak >= 10 &&
      (winnerGames <= 1 && loserGames <= 1)
    ) {
      sets.push({
        recruitGames: recruitIsWinner ? winnerTiebreak : (loserTiebreak ?? loserGames),
        opponentGames: recruitIsWinner ? (loserTiebreak ?? loserGames) : winnerTiebreak,
        isMatchTiebreak: true,
      });
      continue;
    }

    if (winnerGames === 0 && loserGames === 0) continue;

    const recruitGames = recruitIsWinner ? winnerGames : loserGames;
    const opponentGames = recruitIsWinner ? loserGames : winnerGames;

    let tiebreakPoints: number | null = null;
    if (recruitGames === 7 && opponentGames === 6 && loserTiebreak != null) {
      tiebreakPoints = loserTiebreak;
    } else if (recruitGames === 6 && opponentGames === 7 && loserTiebreak != null) {
      tiebreakPoints = loserTiebreak;
    }

    sets.push({
      recruitGames,
      opponentGames,
      tiebreakPoints,
    });
  }

  return sets;
}

function matchStatusLabel(match: UtrApiMatch): string | undefined {
  const parts = [match.outcome, match.completionType, match.matchOutcome].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function eventDateIso(event: UtrApiEvent, match: UtrApiMatch): string | undefined {
  const raw = match.date ?? event.startDate ?? event.date;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return normalizeTrnTournamentDate(trimmed) ?? undefined;
}

function flattenUtrMatches(payload: UtrApiResultsPayload): Array<{ event: UtrApiEvent; match: UtrApiMatch }> {
  const rows: Array<{ event: UtrApiEvent; match: UtrApiMatch }> = [];
  for (const event of payload.events ?? []) {
    for (const match of event.results ?? []) {
      rows.push({ event, match });
    }
    for (const draw of event.draws ?? []) {
      for (const match of draw.results ?? []) {
        rows.push({ event, match });
      }
    }
  }
  return rows;
}

export function normalizeUtrApiMatch(input: {
  event: UtrApiEvent;
  match: UtrApiMatch;
  recruitPersonId: string;
  utrPlayerId: string;
  recruitName: string;
}): NormalizedUtrImportRow {
  const { event, match, utrPlayerId, recruitName } = input;
  const warnings: string[] = [];

  const winner = match.players?.winner1;
  const loser = match.players?.loser1;
  const recruitId = String(utrPlayerId);
  const winnerId = winner?.id != null ? String(winner.id) : "";
  const loserId = loser?.id != null ? String(loser.id) : "";

  let recruitIsWinner: boolean | undefined;
  let opponent = loser;
  let recruitPlayer = winner;

  if (winnerId === recruitId) {
    recruitIsWinner = true;
    opponent = loser;
    recruitPlayer = winner;
  } else if (loserId === recruitId) {
    recruitIsWinner = false;
    opponent = winner;
    recruitPlayer = loser;
  } else if (match.isWinner === true) {
    recruitIsWinner = true;
    opponent = loser;
    recruitPlayer = winner;
  } else if (match.isWinner === false) {
    recruitIsWinner = false;
    opponent = winner;
    recruitPlayer = loser;
  } else {
    warnings.push("Could not determine recruit side in match");
    recruitIsWinner = undefined;
    opponent = loser ?? winner;
    recruitPlayer = winner ?? loser;
  }

  const sets =
    recruitIsWinner === undefined
      ? extractSetsForRecruit(match, true)
      : extractSetsForRecruit(match, recruitIsWinner);

  const scoreResult = reconstructUtrScore({
    sets,
    matchStatus: matchStatusLabel(match),
    outcome: match.outcome,
  });
  warnings.push(...scoreResult.warnings);

  const tournamentName = event.name?.trim() || "UNKNOWN";
  const matchDate = eventDateIso(event, match) ?? "UNKNOWN";
  if (matchDate === "UNKNOWN") warnings.push("Tournament date unknown");

  const opponentName = playerDisplayName(opponent);
  if (opponentName === "UNKNOWN") warnings.push("Could not parse opponent");

  const round = match.round?.code?.trim() || match.round?.name?.trim() || "UNKNOWN";

  const statusLabel = matchStatusLabel(match);
  const walkoverOrDefault =
    isWalkoverOrDefaultStatus(statusLabel) ||
    isWalkoverOrDefaultStatus(match.outcome) ||
    isWalkoverOrDefaultStatus(match.completionType);
  const result = outcomeFromUtrIsWinner(recruitIsWinner);
  const clearWalkoverOutcome =
    walkoverOrDefault &&
    result !== "UNKNOWN" &&
    opponentName !== "UNKNOWN" &&
    tournamentName !== "UNKNOWN" &&
    matchDate !== "UNKNOWN";

  return {
    source: "UTR",
    recruitName,
    utrPlayerId,
    tournamentName,
    matchDate,
    round,
    opponentName,
    recruitUtr: formatUtrRating(recruitPlayer?.singlesUtr),
    opponentUtr: formatUtrRating(opponent?.singlesUtr),
    score: scoreResult.score,
    result,
    matchStatus: statusLabel,
    externalMatchId: match.id != null ? String(match.id) : undefined,
    tournamentUrl: buildUtrEventUrl(event.id),
    needsReview: clearWalkoverOutcome
      ? false
      : scoreResult.needsReview || warnings.length > 0,
    warnings,
  };
}

export function normalizeUtrApiResults(input: {
  payload: UtrApiResultsPayload;
  recruitPersonId: string;
  utrPlayerId: string;
  recruitName: string;
}): NormalizedUtrImportRow[] {
  return flattenUtrMatches(input.payload).map(({ event, match }) =>
    normalizeUtrApiMatch({
      event,
      match,
      recruitPersonId: input.recruitPersonId,
      utrPlayerId: input.utrPlayerId,
      recruitName: input.recruitName,
    }),
  );
}

function resolveCaptureTournamentUrl(capture: UtrCapturedMatch): string | undefined {
  const direct = capture.tournamentUrl?.trim();
  if (direct) return direct;
  return buildUtrEventUrl(capture.utrEventId);
}

export function normalizeUtrCapturedMatches(
  captures: readonly UtrCapturedMatch[],
): NormalizedUtrImportRow[] {
  return captures.map((capture) => {
    const warnings = [...(capture.parseWarnings ?? [])];
    const tournamentUrl = resolveCaptureTournamentUrl(capture);

    const preNormalizedScore = capture.score?.trim();
    if (
      preNormalizedScore &&
      preNormalizedScore.toUpperCase() !== "UNKNOWN" &&
      (!capture.sets || capture.sets.length === 0)
    ) {
      return {
        source: "UTR" as const,
        recruitName: capture.recruitName,
        utrPlayerId: capture.utrPlayerId,
        tournamentName: capture.tournamentName?.trim() || "UNKNOWN",
        matchDate: capture.matchDate?.trim() || "UNKNOWN",
        round: capture.round?.trim() || "UNKNOWN",
        opponentName: capture.opponentName?.trim() || "UNKNOWN",
        recruitUtr: capture.recruitUtr,
        opponentUtr: capture.opponentUtr,
        score: preNormalizedScore,
        result: capture.result ?? outcomeFromUtrIsWinner(undefined),
        matchStatus: capture.matchStatus,
        externalMatchId: capture.externalMatchId,
        tournamentUrl,
        needsReview: capture.needsReview ?? warnings.length > 0,
        warnings,
      };
    }

    const scoreResult = reconstructUtrScore({
      sets: (capture.sets ?? []).map((set) => ({
        recruitGames: set.recruitGames,
        opponentGames: set.opponentGames,
        tiebreakPoints: set.tiebreakPoints,
        isMatchTiebreak: set.isMatchTiebreak,
      })),
      matchStatus: capture.matchStatus,
      outcome: capture.result,
    });
    warnings.push(...scoreResult.warnings);

    return {
      source: "UTR" as const,
      recruitName: capture.recruitName,
      utrPlayerId: capture.utrPlayerId,
      tournamentName: capture.tournamentName?.trim() || "UNKNOWN",
      matchDate: capture.matchDate?.trim() || "UNKNOWN",
      round: capture.round?.trim() || "UNKNOWN",
      opponentName: capture.opponentName?.trim() || "UNKNOWN",
      recruitUtr: capture.recruitUtr,
      opponentUtr: capture.opponentUtr,
      score: scoreResult.score,
      result: capture.result ?? outcomeFromUtrIsWinner(undefined),
      matchStatus: capture.matchStatus,
      externalMatchId: capture.externalMatchId,
      tournamentUrl,
      needsReview:
        capture.needsReview ||
        scoreResult.needsReview ||
        warnings.length > 0 ||
        scoreResult.score === "UNKNOWN",
      warnings,
    };
  });
}

export function crossSourcePreviewLabel(
  opponentName: string,
  existingOpponent?: string,
): boolean {
  return (
    normalizeOpponentName(opponentName) === normalizeOpponentName(existingOpponent)
  );
}

export { findCrossSourceMatch };
