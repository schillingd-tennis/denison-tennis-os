/**
 * Reconstruct tennis score strings from UTR structured set data.
 * Avoids mangled scores like "6-1 6-0" → recruit 66 / opponent 10.
 */
export type UtrSetScore = {
  recruitGames: number;
  opponentGames: number;
  /** Tiebreak points for the loser in a 7-6 style set, when known. */
  tiebreakPoints?: number | null;
  /** Super tiebreak set (e.g. [10-7]) when present. */
  isMatchTiebreak?: boolean;
};

export type UtrScoreInput = {
  sets: UtrSetScore[];
  matchStatus?: string | null;
  outcome?: string | null;
};

const RETIREMENT_PATTERN = /ret/i;
const WALKOVER_PATTERN =
  /walkover|default|did not start|didnotstart|winnerdidnotstart|loserdidnotstart|opponentdidnotstart|winner did not start|loser did not start/i;
const CORRUPTED_SCORE_PATTERN = /^\d{2,}-\d{1,2}$/;

export function isWalkoverOrDefaultStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return WALKOVER_PATTERN.test(status);
}

function formatSetScore(set: UtrSetScore): string {
  const { recruitGames, opponentGames, tiebreakPoints, isMatchTiebreak } = set;

  if (isMatchTiebreak) {
    return `[${recruitGames}-${opponentGames}]`;
  }

  const recruitWonSet = recruitGames > opponentGames;
  if (
    tiebreakPoints != null &&
    tiebreakPoints >= 0 &&
    ((recruitWonSet && recruitGames === 7 && opponentGames === 6) ||
      (!recruitWonSet && recruitGames === 6 && opponentGames === 7))
  ) {
    return `${recruitGames}-${opponentGames}(${tiebreakPoints})`;
  }

  return `${recruitGames}-${opponentGames}`;
}

/** Build a normalized tennis score string from structured UTR set rows. */
export function reconstructUtrScore(input: UtrScoreInput): {
  score: string;
  needsReview: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (input.sets.length === 0) {
    const status = input.matchStatus ?? input.outcome ?? "";
    if (status && RETIREMENT_PATTERN.test(status)) {
      return { score: "Ret.", needsReview: false, warnings: ["Retirement without set scores"] };
    }
    if (isWalkoverOrDefaultStatus(status)) {
      return { score: "WO", needsReview: false, warnings: [] };
    }
    return { score: "UNKNOWN", needsReview: true, warnings: ["No set scores available"] };
  }

  for (const set of input.sets) {
    if (
      !Number.isFinite(set.recruitGames) ||
      !Number.isFinite(set.opponentGames) ||
      set.recruitGames < 0 ||
      set.opponentGames < 0 ||
      set.recruitGames > 99 ||
      set.opponentGames > 99
    ) {
      warnings.push("Invalid set games");
      return { score: "UNKNOWN", needsReview: true, warnings };
    }
  }

  const parts = input.sets.map(formatSetScore);
  let score = parts.join(" ");

  const status = `${input.matchStatus ?? ""} ${input.outcome ?? ""}`.trim();
  if (RETIREMENT_PATTERN.test(status) && !/ret/i.test(score)) {
    score = `${score} Ret.`.trim();
  }

  if (CORRUPTED_SCORE_PATTERN.test(score.replace(/\s+/g, ""))) {
    warnings.push("Score looks corrupted");
    return { score: "UNKNOWN", needsReview: true, warnings };
  }

  const needsReview = warnings.length > 0;
  return { score, needsReview, warnings };
}

/** Parse DOM-assembled set pairs like [[6,1],[6,0]] into structured sets. */
export function setsFromDomPairs(pairs: Array<[number, number]>): UtrSetScore[] {
  return pairs
    .filter(([recruit, opponent]) => Number.isFinite(recruit) && Number.isFinite(opponent))
    .map(([recruitGames, opponentGames]) => ({ recruitGames, opponentGames }));
}
