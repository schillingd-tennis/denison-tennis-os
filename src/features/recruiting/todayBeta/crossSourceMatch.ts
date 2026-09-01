/**
 * Cautious cross-source match detection (TRN ↔ UTR).
 */
import type { MatchResultOutcome, RecruitMatchResult } from "./types";

export type CrossSourceMatchCandidate = {
  opponentName: string;
  tournamentName: string;
  tournamentDate?: string;
  score: string;
  round?: string;
};

export type CrossSourceMatchResult =
  | { kind: "none" }
  | { kind: "confident"; existing: RecruitMatchResult }
  | { kind: "ambiguous"; existing: RecruitMatchResult; reason: string };

export function normalizeMatchToken(value: string | undefined | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/\s+/g, " ");
}

export function normalizeOpponentName(value: string | undefined | null): string {
  return normalizeMatchToken(value).replace(/\(\d+\)$/, "").trim();
}

export function normalizeTournamentName(value: string | undefined | null): string {
  return normalizeMatchToken(value)
    .replace(/^l[1-9]\s+/, "")
    .replace(/\bboys?\s*'?s?\s*\d+\s*(?:&\s*\d+\s*)?under\s*singles?\b/g, " ")
    .replace(/\bboys?\s*'?s?\s*16\s*&?\s*18\b/g, "16 18")
    .replace(/\bb16\s*,?\s*18\b/g, "16 18")
    .replace(/\b16\s*&?\s*18\b/g, "16 18")
    .replace(/\bat the\b/g, "at")
    .replace(/\bjr\.?\b/g, "jr")
    .replace(/\bchmp\.?\b/g, "championship")
    .replace(/\bchmps\.?\b/g, "championship")
    .replace(/\bchampionships\b/g, "championship")
    .replace(/\bnatiional\b/g, "national")
    .replace(/\bcincinnati o\b/g, "cincinnati open")
    .replace(/\bnational clay courts?\b/g, "national clay court championships")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeScore(value: string | undefined | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+ret\.?$/i, " ret.");
}

function flipSetToken(set: string): string {
  const matchTiebreak = set.match(/^\[(\d+)-(\d+)\]$/);
  if (matchTiebreak) {
    return `[${matchTiebreak[2]}-${matchTiebreak[1]}]`;
  }

  const tiebreakSet = set.match(/^(\d+)-(\d+)\((\d+)\)$/);
  if (tiebreakSet) {
    return `${tiebreakSet[2]}-${tiebreakSet[1]}(${tiebreakSet[3]})`;
  }

  const plainSet = set.match(/^(\d+)-(\d+)$/);
  if (plainSet) {
    return `${plainSet[2]}-${plainSet[1]}`;
  }

  return set;
}

export function flipScorePerspective(score: string): string {
  return normalizeScore(score)
    .split(" ")
    .map(flipSetToken)
    .join(" ");
}

export function scoresEquivalent(
  left: string | undefined | null,
  right: string | undefined | null,
): boolean {
  const a = normalizeScore(left);
  const b = normalizeScore(right);
  if (!a || !b || a === "unknown" || b === "unknown") return false;
  if (a === b) return true;

  const flippedA = flipScorePerspective(a);
  const flippedB = flipScorePerspective(b);
  return flippedA === b || a === flippedB || flippedA === flippedB;
}

function tournamentNamesCompatible(a: string, b: string): boolean {
  const na = normalizeTournamentName(a);
  const nb = normalizeTournamentName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const tokensA = new Set(na.split(" ").filter((token) => token.length > 2));
  const tokensB = new Set(nb.split(" ").filter((token) => token.length > 2));
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  const minSize = Math.min(tokensA.size, tokensB.size);
  return minSize > 0 && overlap / minSize >= 0.6;
}

export function findCrossSourceMatch(
  existingResults: readonly RecruitMatchResult[],
  candidate: CrossSourceMatchCandidate,
): CrossSourceMatchResult {
  const opponent = normalizeOpponentName(candidate.opponentName);
  const date = candidate.tournamentDate?.slice(0, 10) ?? "";
  const score = normalizeScore(candidate.score);
  const tournament = candidate.tournamentName;

  if (!opponent || !date || !score || score === "unknown") {
    return { kind: "none" };
  }

  let ambiguous: CrossSourceMatchResult | null = null;
  const tournamentFallbackCandidates: RecruitMatchResult[] = [];

  for (const existing of existingResults) {
    const existingOpponent = normalizeOpponentName(existing.opponentName);
    if (existingOpponent !== opponent) continue;

    const existingDate = existing.tournamentDate?.slice(0, 10) ?? "";
    const scoreMatches = scoresEquivalent(score, existing.score);
    const tournamentMatches = tournamentNamesCompatible(
      tournament,
      existing.tournamentName ?? "",
    );

    if (existingDate === date) {
      if (scoreMatches) {
        return { kind: "confident", existing };
      }

      if (tournamentMatches) {
        ambiguous = {
          kind: "ambiguous",
          existing,
          reason: "Opponent, date, and tournament match but score differs",
        };
      }
      continue;
    }

    if (scoreMatches && tournamentMatches) {
      tournamentFallbackCandidates.push(existing);
    }
  }

  if (tournamentFallbackCandidates.length === 1) {
    return { kind: "confident", existing: tournamentFallbackCandidates[0]! };
  }

  if (tournamentFallbackCandidates.length > 1) {
    return {
      kind: "ambiguous",
      existing: tournamentFallbackCandidates[0]!,
      reason:
        "Multiple TRN rows match opponent, score, and tournament with differing dates",
    };
  }

  return ambiguous ?? { kind: "none" };
}

export function outcomeFromUtrIsWinner(isWinner: boolean | undefined): MatchResultOutcome {
  if (isWinner === true) return "WIN";
  if (isWinner === false) return "LOSS";
  return "UNKNOWN";
}

export function formatUtrRating(value: number | string | undefined | null): string | undefined {
  if (value == null || value === "") return undefined;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value).trim() || undefined;
  const fixed = num.toFixed(2);
  return fixed.replace(/\.?0+$/, "") || fixed;
}
