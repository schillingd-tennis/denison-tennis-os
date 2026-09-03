import type { ScoreSet } from "./types";

export const SCORE_FORMAT_HINT =
  "Couldn’t parse the score. Use a format such as “6-1, 6-1”.";

/** Unambiguous completed-set shorthand without a hyphen (games for the winner, then loser). */
export const COMPACT_SET_TOKENS = new Set([
  "60",
  "61",
  "62",
  "63",
  "64",
  "75",
  "76",
  "16",
  "26",
  "36",
  "46",
  "57",
  "67",
]);

function scoreTokenRegex() {
  return /(\d{1,2})\s*[-–—]\s*(\d{1,2})/g;
}

export function tokenizeResultSide(raw: string): string[] {
  return raw
    .trim()
    .split(/[\s,;]+/)
    .flatMap(splitGluedNameAndNumber)
    .filter(Boolean);
}

function splitGluedNameAndNumber(token: string): string[] {
  const glued = /^([A-Za-z][A-Za-z.'-]*)(\d{2,3})$/.exec(token);
  if (!glued) return [token];
  return [glued[1]!, glued[2]!];
}

export function isValidSetToken(token: string): boolean {
  return /^\d{1,2}[-–—]\d{1,2}$/.test(token.trim());
}

export function isBareScoreNumber(token: string): boolean {
  return /^\d{1,3}$/.test(token.trim());
}

export function isCompactSetToken(token: string): boolean {
  return COMPACT_SET_TOKENS.has(token.trim());
}

export function isScoreLikeToken(token: string): boolean {
  return isValidSetToken(token) || isBareScoreNumber(token);
}

export function expandCompactSetToken(token: string): ScoreSet | null {
  const trimmed = token.trim();
  if (!isCompactSetToken(trimmed)) return null;
  return {
    winnerGames: Number(trimmed[0]),
    loserGames: Number(trimmed[1]),
  };
}

/** Unfinished current-set shorthand: any 2-digit token with games 0–7, e.g. 32 → 3-2. */
export function expandPartialCompactSetToken(token: string): ScoreSet | null {
  const trimmed = token.trim();
  if (!/^\d{2}$/.test(trimmed)) return null;
  const winnerGames = Number(trimmed[0]);
  const loserGames = Number(trimmed[1]);
  if (winnerGames > 7 || loserGames > 7) return null;
  return { winnerGames, loserGames };
}

export function suggestHyphenatedSet(token: string): string | null {
  const expanded = expandCompactSetToken(token);
  if (!expanded) return null;
  return `${expanded.winnerGames}-${expanded.loserGames}`;
}

export function formatInvalidSetError(token: string): string {
  return `Couldn’t parse the set “${token.trim()}”.`;
}

export function splitNameAndScoreText(
  remainder: string,
): { name: string; scoreText: string } | { error: string } {
  const tokens = tokenizeResultSide(remainder);
  const scoreIndex = tokens.findIndex(isScoreLikeToken);
  if (scoreIndex === -1) {
    return { name: tokens.join(" "), scoreText: "" };
  }
  if (scoreIndex === 0) {
    return { error: "Couldn’t determine the loser. Put the player name before the score." };
  }
  return {
    name: tokens.slice(0, scoreIndex).join(" "),
    scoreText: tokens.slice(scoreIndex).join(" "),
  };
}

function parseOneSetToken(
  token: string,
  { allowPartialSets = false }: { allowPartialSets?: boolean } = {},
): ScoreSet | { error: string } {
  if (isValidSetToken(token)) {
    const [winnerGames, loserGames] = token.split(/[-–—]/).map(Number);
    return { winnerGames, loserGames };
  }
  const compact = expandCompactSetToken(token);
  if (compact) return compact;
  if (allowPartialSets) {
    const partial = expandPartialCompactSetToken(token);
    if (partial) return partial;
  }
  return { error: formatInvalidSetError(token) };
}

export function parseScoreSets(
  raw: string,
  { allowPartialSets = false }: { allowPartialSets?: boolean } = {},
): { sets: ScoreSet[]; scoreText: string } | { error: string } {
  const tokens = tokenizeResultSide(raw);
  if (tokens.length === 0) return { error: SCORE_FORMAT_HINT };

  const valid: ScoreSet[] = [];
  const malformed: string[] = [];

  for (const token of tokens) {
    const parsed = parseOneSetToken(token, { allowPartialSets });
    if ("error" in parsed) {
      malformed.push(token);
      continue;
    }
    valid.push(parsed);
  }

  if (malformed.length > 0) {
    const bad = malformed[0]!;
    if (valid.length > 0 || isBareScoreNumber(bad)) {
      return { error: formatInvalidSetError(bad) };
    }
    return { error: SCORE_FORMAT_HINT };
  }

  if (valid.length === 0) {
    return { error: SCORE_FORMAT_HINT };
  }

  return { sets: valid, scoreText: formatScoreSets(valid) };
}

export function formatScoreSets(sets: readonly ScoreSet[]): string {
  return sets.map((set) => `${set.winnerGames}-${set.loserGames}`).join(", ");
}

export function invertScoreSets(sets: readonly ScoreSet[]): ScoreSet[] {
  return sets.map((set) => ({
    winnerGames: set.loserGames,
    loserGames: set.winnerGames,
  }));
}

export function remainderWithoutScores(raw: string): string {
  return raw.replace(scoreTokenRegex(), " ").replace(/[,;]+/g, " ").replace(/\s+/g, " ").trim();
}
