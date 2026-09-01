/**
 * Baseline vs newly detected match result classification (Today Beta v0.1).
 */
import type {
  RecruitExternalProfiles,
  RecruitMatchResult,
  MatchResultDetectionStatus,
} from "./types";

export type { MatchResultDetectionStatus };

export function isBaselineEstablished(profiles: RecruitExternalProfiles): boolean {
  return Boolean(
    profiles.trn?.baselineEstablishedAt?.trim() ||
      profiles.utr?.baselineEstablishedAt?.trim(),
  );
}

export function detectionStatusForImport(baselineEstablished: boolean): MatchResultDetectionStatus {
  return baselineEstablished ? "NEW" : "BASELINE";
}

/** UTR-only rows on or before baseline day are historical context, not recruiting alerts. */
export function detectionStatusForUtrImportRow(input: {
  baselineEstablished: boolean;
  baselineEstablishedAt?: string;
  matchDate?: string;
}): MatchResultDetectionStatus {
  if (!input.baselineEstablished) return "BASELINE";

  const baselineDay = input.baselineEstablishedAt?.slice(0, 10);
  const matchDay = input.matchDate?.slice(0, 10);
  if (!baselineDay || !matchDay || matchDay === "UNKNOWN") {
    return "NEW";
  }

  return matchDay <= baselineDay ? "BASELINE" : "NEW";
}

export function isNewlyDetectedResult(
  result: Pick<RecruitMatchResult, "detectionStatus">,
): boolean {
  return result.detectionStatus === "NEW";
}

export function isEligibleForContactOpportunity(
  result: Pick<RecruitMatchResult, "detectionStatus">,
): boolean {
  return result.detectionStatus === "NEW";
}

export function filterNewResultsFeed(
  results: readonly RecruitMatchResult[],
  options: { windowDays: number; now?: Date },
): RecruitMatchResult[] {
  const now = options.now ?? new Date();
  const cutoff = now.getTime() - options.windowDays * 24 * 60 * 60 * 1000;
  return results.filter(
    (result) =>
      result.detectionStatus === "NEW" &&
      new Date(result.firstDetectedAt).getTime() >= cutoff,
  );
}

export type ImportRowPlan = {
  fingerprint: string;
  detectionStatus: MatchResultDetectionStatus | null;
};

/** Pure import planner for duplicate handling and baseline vs new classification. */
export function planMatchResultImport(input: {
  baselineEstablished: boolean;
  existingFingerprints: ReadonlySet<string>;
  rowFingerprints: readonly string[];
}): { plans: ImportRowPlan[]; establishesBaseline: boolean } {
  const statusForNewRows = detectionStatusForImport(input.baselineEstablished);
  const plans = input.rowFingerprints.map((fingerprint) => ({
    fingerprint,
    detectionStatus: input.existingFingerprints.has(fingerprint) ? null : statusForNewRows,
  }));

  const establishesBaseline =
    !input.baselineEstablished &&
    plans.some((plan) => plan.detectionStatus === "BASELINE");

  return { plans, establishesBaseline };
}
