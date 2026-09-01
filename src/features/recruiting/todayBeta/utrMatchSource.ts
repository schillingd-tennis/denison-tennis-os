import type { RecruitMatchResult } from "./types";

/** Compact provenance label for Latest Results and tables. */
export function formatMatchSourceLabel(result: RecruitMatchResult): string {
  const source = result.source.toLowerCase();
  const hasUtrData = Boolean(
    result.externalMatchId ||
      result.ratingType === "UTR" ||
      result.recruitRating ||
      result.opponentRating,
  );

  if (source.includes("trn") && hasUtrData) {
    return "TRN + UTR";
  }
  if (source.includes("trn")) {
    return "TRN";
  }
  if (source === "utr") {
    return "UTR";
  }
  return source.toUpperCase();
}
