/**
 * Recruiting analytics engine (BP-044).
 *
 * Reproduces Coda scoring on a WTN-present pool. Does not write Person or
 * Recruit Profile columns.
 */
import { mix304030, reliabilityDisplayed, reliabilityRaw, adjustedTrRank, tierFromCompositeZ } from "./formulas";
import { competitionRank, round2, sampleMean, sampleSd } from "./math";
import {
  ADJUSTED_TR_RANK_CENTER,
  OUTSIDE_POOL_RANK_SENTINEL,
  type RecruitAnalyticsPoolStats,
  type RecruitAnalyticsResult,
  type RecruitAnalyticsSubject,
} from "./types";

function isPresent(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function lookupOrSentinel(
  value: number,
  valueToRank: Map<number, number>,
): number {
  const found = valueToRank.get(value);
  return found !== undefined ? found : OUTSIDE_POOL_RANK_SENTINEL;
}

export function buildPoolStats(subjects: readonly RecruitAnalyticsSubject[]): RecruitAnalyticsPoolStats {
  const pool = subjects.filter((row) => isPresent(row.wtn));
  const trn = pool.map((row) => row.trnRank).filter(isPresent);
  const utr = pool.map((row) => row.utr).filter(isPresent);
  const wtn = pool.map((row) => row.wtn).filter(isPresent);

  return {
    size: pool.length,
    trnCount: trn.length,
    trnMean: trn.length ? sampleMean(trn) : NaN,
    trnSampleSd: trn.length >= 2 ? sampleSd(trn) : NaN,
    utrMean: utr.length ? sampleMean(utr) : NaN,
    utrSampleSd: utr.length >= 2 ? sampleSd(utr) : NaN,
    wtnMean: wtn.length ? sampleMean(wtn) : NaN,
    wtnSampleSd: wtn.length >= 2 ? sampleSd(wtn) : NaN,
  };
}

export function computeRecruitingAnalytics(
  subjects: readonly RecruitAnalyticsSubject[],
): RecruitAnalyticsResult[] {
  const pool = subjects.filter((row) => isPresent(row.wtn));
  const poolTrn = pool.map((row) => row.trnRank).filter(isPresent);
  const poolUtr = pool.map((row) => row.utr).filter(isPresent);
  const poolWtn = pool.map((row) => row.wtn).filter(isPresent);
  const stats = buildPoolStats(subjects);

  const trnToRank = new Map<number, number>();
  for (const trn of poolTrn) {
    if (!trnToRank.has(trn)) {
      trnToRank.set(trn, competitionRank(trn, poolTrn, "asc"));
    }
  }
  const utrToRank = new Map<number, number>();
  for (const utr of poolUtr) {
    if (!utrToRank.has(utr)) {
      utrToRank.set(utr, competitionRank(utr, poolUtr, "desc"));
    }
  }

  const withRanks: RecruitAnalyticsResult[] = subjects.map((row) => {
    const inPool = isPresent(row.wtn);
    const result: RecruitAnalyticsResult = { id: row.id, inPool };

    if (isPresent(row.wtn)) {
      result.wtnRank = competitionRank(row.wtn, poolWtn, "asc");
      result.wtnZ = round2((stats.wtnMean - row.wtn) / stats.wtnSampleSd);
    }

    if (isPresent(row.trnRank)) {
      result.trRank = inPool
        ? competitionRank(row.trnRank, poolTrn, "asc")
        : lookupOrSentinel(row.trnRank, trnToRank);
      result.trZ = round2((stats.trnMean - row.trnRank) / stats.trnSampleSd);
    }

    if (row.utrInvalid) {
      result.utrRank = OUTSIDE_POOL_RANK_SENTINEL;
    } else if (isPresent(row.utr)) {
      result.utrRank = inPool
        ? competitionRank(row.utr, poolUtr, "desc")
        : lookupOrSentinel(row.utr, utrToRank);
      result.utrZ = round2((row.utr - stats.utrMean) / stats.utrSampleSd);
    }

    let adjUnrounded: number | null = null;
    if (isPresent(row.trnRank)) {
      if (!inPool || result.trRank === OUTSIDE_POOL_RANK_SENTINEL) {
        adjUnrounded = ADJUSTED_TR_RANK_CENTER;
        result.adjustedTrRank = round2(adjUnrounded);
      } else if (isPresent(result.trRank)) {
        const raw = inPool ? reliabilityRaw(row.matchesPlayed) : 1;
        adjUnrounded = adjustedTrRank(result.trRank, raw);
        result.adjustedTrRank = round2(adjUnrounded);
      }
    }

    if (isPresent(row.wtn)) {
      const wtn = row.wtn;
      const raw = reliabilityRaw(row.matchesPlayed);
      result.reliabilityRaw = raw;
      result.reliability = reliabilityDisplayed(raw);

      const trForMix = isPresent(result.trRank) ? result.trRank : null;
      if (isPresent(result.utrRank) && isPresent(result.wtnRank)) {
        const weightedUnrounded = mix304030(trForMix, result.utrRank, result.wtnRank);
        result.weightedScore = round2(weightedUnrounded);
        result.reliabilityScore = round2(mix304030(adjUnrounded, result.utrRank, result.wtnRank));
      }

      const trZUnrounded = isPresent(row.trnRank)
        ? (stats.trnMean - row.trnRank) / stats.trnSampleSd
        : null;
      const utrZUnrounded = isPresent(row.utr)
        ? (row.utr - stats.utrMean) / stats.utrSampleSd
        : null;
      const wtnZUnrounded = (stats.wtnMean - wtn) / stats.wtnSampleSd;
      if (utrZUnrounded !== null) {
        result.compositeZ = round2(mix304030(trZUnrounded, utrZUnrounded, wtnZUnrounded));
        result.tier = tierFromCompositeZ(result.compositeZ);
      }
    }

    return result;
  });

  const poolScores = withRanks
    .filter((row) => row.inPool && isPresent(row.weightedScore))
    .map((row) => row.weightedScore as number);

  return withRanks.map((row) => {
    if (row.inPool && isPresent(row.weightedScore)) {
      return {
        ...row,
        compositeRank: competitionRank(row.weightedScore, poolScores, "asc"),
      };
    }
    return row;
  });
}
