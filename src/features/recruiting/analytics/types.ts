/**
 * Recruiting analytics types (BP-044).
 *
 * Outputs are engine results, not Person or Recruit Profile columns.
 */

export const ADJUSTED_TR_RANK_CENTER = 90.48;
export const RANK_WEIGHT_TR = 0.3;
export const RANK_WEIGHT_UTR = 0.4;
export const RANK_WEIGHT_WTN = 0.3;
export const RELIABILITY_MATCH_CAP = 30;
export const OUTSIDE_POOL_RANK_SENTINEL = -1;

export type RecruitTier =
  | "1 - Elite"
  | "2 - Strong"
  | "3 - Core"
  | "4 - Fringe"
  | "5 - Long Shot";

/** Tennis facts the engine reads. Not stored analytics. */
export type RecruitAnalyticsSubject = {
  id: string;
  /** Raw TennisRecruiting.net rank (Person.trnRank). */
  trnRank?: number | null;
  utr?: number | null;
  /**
   * Coda stored a non-numeric UTR string. Rank is -1 and UTR Z is blank
   * even if a cleaned number is available.
   */
  utrInvalid?: boolean;
  wtn?: number | null;
  matchesPlayed?: number | null;
};

/** Person tennis facts the engine reads. Analytics are not written back. */
export type RecruitAnalyticsPersonInput = {
  id: string;
  trnRank?: number | null;
  utr?: number | null;
  wtn?: number | null;
  utrMatchesPlayed?: number | null;
};

export type RecruitAnalyticsResult = {
  id: string;
  inPool: boolean;
  wtnRank?: number;
  /** Competition rank in the WTN pool, pool lookup, or -1. Blank if TRN is blank. */
  trRank?: number;
  utrRank?: number;
  trZ?: number;
  utrZ?: number;
  wtnZ?: number;
  weightedScore?: number;
  compositeRank?: number;
  compositeZ?: number;
  /** Displayed Reliability (2 dp). */
  reliability?: number;
  /** Unrounded Reliability used in Adjusted TR Rank. */
  reliabilityRaw?: number;
  adjustedTrRank?: number;
  reliabilityScore?: number;
  tier?: RecruitTier;
};

export type RecruitAnalyticsPoolStats = {
  size: number;
  trnCount: number;
  trnMean: number;
  trnSampleSd: number;
  utrMean: number;
  utrSampleSd: number;
  wtnMean: number;
  wtnSampleSd: number;
};
