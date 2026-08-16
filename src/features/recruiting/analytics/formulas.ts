/**
 * Audited Coda recruiting formulas (BP-043A / BP-044).
 */
import { round2 } from "./math";
import {
  ADJUSTED_TR_RANK_CENTER,
  RANK_WEIGHT_TR,
  RANK_WEIGHT_UTR,
  RANK_WEIGHT_WTN,
  RELIABILITY_MATCH_CAP,
  type RecruitTier,
} from "./types";

/** 30/40/30 mix. Missing TR renormalizes onto the remaining 70%. */
export function mix304030(tr: number | null, utr: number, wtn: number): number {
  if (tr === null) {
    return (RANK_WEIGHT_UTR * utr + RANK_WEIGHT_WTN * wtn) / (RANK_WEIGHT_UTR + RANK_WEIGHT_WTN);
  }
  return RANK_WEIGHT_TR * tr + RANK_WEIGHT_UTR * utr + RANK_WEIGHT_WTN * wtn;
}

/**
 * Raw reliability. Blank matches → 1 (Coda IfBlank behavior).
 * Use this unrounded value in Adjusted TR Rank.
 */
export function reliabilityRaw(matchesPlayed: number | null | undefined): number {
  if (matchesPlayed === null || matchesPlayed === undefined) return 1;
  return Math.min(matchesPlayed / RELIABILITY_MATCH_CAP, 1);
}

export function reliabilityDisplayed(raw: number): number {
  return round2(raw);
}

/**
 * Shrink TR Rank toward 90.48 using unrounded reliability.
 * Caller applies outside-pool / -1 → 90.48 and blank TR → blank.
 */
export function adjustedTrRank(trRank: number, rawReliability: number): number {
  return trRank * rawReliability + ADJUSTED_TR_RANK_CENTER * (1 - rawReliability);
}

/** Observed Coda bands. Core is strict `> -0.75` (Samuel Schumacher −0.75 = Fringe). */
export function tierFromCompositeZ(compositeZ: number): RecruitTier {
  if (compositeZ >= 1.5) return "1 - Elite";
  if (compositeZ >= 0.75) return "2 - Strong";
  if (compositeZ > -0.75) return "3 - Core";
  if (compositeZ > -1.5) return "4 - Fringe";
  return "5 - Long Shot";
}
