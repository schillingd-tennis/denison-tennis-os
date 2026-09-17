import type { ScoreSet } from "./types";

export const SCORE_FORMAT_HINT =
  "Couldn’t parse the score. Use formats such as “6-1, 6-1”, “7-6(5)”, or “10-8” (MTB).";

const STATUS_MARKERS: Array<{ pattern: RegExp; status: import("./types").MatchResultStatus }> = [
  { pattern: /\bret(?:ired|\.?)\b/i, status: "retired" },
  { pattern: /\b(?:wo|w\/o|walk[\s-]?over)\b/i, status: "walkover" },
  { pattern: /\bdefault(?:ed)?\b/i, status: "default" },
  { pattern: /\bunf(?:inished)?\b|\bdnf\b|\bstopped\b|\bclinch\b/i, status: "unfinished" },
  { pattern: /\bcancel(?:led|ed)?\b/i, status: "cancelled" },
  { pattern: /\bbye\b/i, status: "bye" },
];

export function detectResultStatusFromText(
  raw: string,
): import("./types").MatchResultStatus | null {
  for (const marker of STATUS_MARKERS) {
    if (marker.pattern.test(raw)) return marker.status;
  }
  return null;
}

function tokenizeScore(raw: string): string[] {
  return raw
    .trim()
    .replace(/\bret(?:ired|\.?)\b/gi, " ")
    .replace(/\b(?:wo|w\/o|walk[\s-]?over)\b/gi, " ")
    .replace(/\bdefault(?:ed)?\b/gi, " ")
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseSetToken(token: string): ScoreSet | { error: string } {
  const mtb = /^(\d{1,2})\s*[-–—]\s*(\d{1,2})$/.exec(token);
  const withTb = /^(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*\((\d{1,2})(?:[-–—](\d{1,2}))?\)$/.exec(token);
  if (withTb) {
    const winnerGames = Number(withTb[1]);
    const loserGames = Number(withTb[2]);
    const winnerTb = Number(withTb[3]);
    const loserTb = withTb[4] != null ? Number(withTb[4]) : null;
    return {
      winnerGames,
      loserGames,
      winnerTb,
      loserTb,
      isMatchTiebreak: winnerGames >= 10 || loserGames >= 10,
    };
  }
  if (mtb) {
    const winnerGames = Number(mtb[1]);
    const loserGames = Number(mtb[2]);
    return {
      winnerGames,
      loserGames,
      isMatchTiebreak: winnerGames >= 10 || loserGames >= 10,
    };
  }
  if (/^\d{2}$/.test(token) && Number(token[0]) <= 7 && Number(token[1]) <= 7) {
    return { winnerGames: Number(token[0]), loserGames: Number(token[1]) };
  }
  return { error: `Couldn’t parse the set “${token}”.` };
}

export function parseScoreSets(
  raw: string,
): { sets: ScoreSet[]; scoreText: string } | { error: string } {
  const cleaned = raw.trim();
  if (!cleaned) return { error: SCORE_FORMAT_HINT };
  if (detectResultStatusFromText(cleaned) && !/\d/.test(cleaned)) {
    return { sets: [], scoreText: cleaned };
  }

  const tokens = tokenizeScore(cleaned);
  if (tokens.length === 0) return { error: SCORE_FORMAT_HINT };

  const sets: ScoreSet[] = [];
  for (const token of tokens) {
    const parsed = parseSetToken(token);
    if ("error" in parsed) return parsed;
    sets.push(parsed);
  }
  return { sets, scoreText: formatScoreSets(sets) };
}

export function formatScoreSets(sets: readonly ScoreSet[]): string {
  return sets
    .map((set) => {
      const base = `${set.winnerGames}-${set.loserGames}`;
      if (set.winnerTb != null) {
        return set.loserTb != null ? `${base}(${set.winnerTb}-${set.loserTb})` : `${base}(${set.winnerTb})`;
      }
      return base;
    })
    .join(", ");
}

export function invertScoreSets(sets: readonly ScoreSet[]): ScoreSet[] {
  return sets.map((set) => ({
    winnerGames: set.loserGames,
    loserGames: set.winnerGames,
    winnerTb: set.loserTb ?? null,
    loserTb: set.winnerTb ?? null,
    isMatchTiebreak: set.isMatchTiebreak,
  }));
}

/** Stable fingerprint for duplicate detection on reimport. */
export function resultFingerprint(parts: {
  discipline: string;
  lineupPosition?: number | null;
  drawName?: string | null;
  roundLabel?: string | null;
  denisonPlayerAId?: string | null;
  denisonPlayerBId?: string | null;
  opponentA?: string | null;
  opponentB?: string | null;
  scoreText?: string | null;
  status?: string | null;
}): string {
  const pair = [parts.denisonPlayerAId ?? "", parts.denisonPlayerBId ?? ""].sort().join("|");
  const opponents = [parts.opponentA ?? "", parts.opponentB ?? ""]
    .map((n) => n.trim().toLowerCase())
    .sort()
    .join("|");
  return [
    parts.discipline,
    parts.lineupPosition ?? "",
    (parts.drawName ?? "").trim().toLowerCase(),
    (parts.roundLabel ?? "").trim().toLowerCase(),
    pair,
    opponents,
    (parts.scoreText ?? "").trim().toLowerCase(),
    parts.status ?? "",
  ].join("::");
}
