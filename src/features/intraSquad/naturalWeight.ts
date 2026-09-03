import type { IntraSquadWeight } from "./types";

const WORD_TO_WEIGHT: Record<string, IntraSquadWeight> = {
  one: 1,
  two: 2,
  three: 3,
  "1": 1,
  "2": 2,
  "3": 3,
};

export type NaturalWeightExtraction = {
  weight: IntraSquadWeight;
  weightFromText: boolean;
  remainder: string;
};

function asWeight(raw: string | undefined): IntraSquadWeight | null {
  if (!raw) return null;
  const mapped = WORD_TO_WEIGHT[raw.toLowerCase()];
  return mapped ?? null;
}

/**
 * Pulls coach-style weight phrases out of match text.
 */
export function extractNaturalWeight(
  raw: string,
  defaultWeight: IntraSquadWeight = 1,
): NaturalWeightExtraction {
  let remainder = raw.trim().replace(/\s+/g, " ");
  let weight: IntraSquadWeight = defaultWeight;
  let weightFromText = false;

  const patterns: RegExp[] = [
    /\(\s*weight\s*[:\-]?\s*([123]|one|two|three)\s*\)/i,
    /\bweight\s*[:\-]?\s*([123]|one|two|three)\b/i,
    /\b(?:value|worth)\s*[:\-]?\s*([123]|one|two|three)\b/i,
    /\bmake that an?\s*([123]|one|two|three)\b/i,
    /\b([123]|one|two|three)[-\s]?point match\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(remainder);
    if (!match) continue;
    const parsed = asWeight(match[1]);
    if (!parsed) continue;
    weight = parsed;
    weightFromText = true;
    remainder = `${remainder.slice(0, match.index)} ${remainder.slice(match.index + match[0].length)}`
      .replace(/\s+/g, " ")
      .trim();
    break;
  }

  return { weight, weightFromText, remainder };
}
