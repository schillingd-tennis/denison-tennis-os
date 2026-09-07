import {
  DENISON_BRAND_LOGO_SRC,
  SCHOOL_LOGOS_BASE_PATH,
  resolveSchoolIdentityFromLabelExact,
} from "@/features/teamSchedule/schoolIdentity";

import type { SchoolLogoResolution } from "./types";

/** Strip ITA gender suffixes and normalize punctuation for logo lookup. */
export function normalizeRankingSchoolName(schoolName: string): string {
  return schoolName
    .replace(/\s*\((?:M|W|Men|Women)\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function initialsFromName(label: string): string {
  const words = label
    .replace(/[^a-zA-Z0-9\s&]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word[0]!)
    .join("")
    .toUpperCase();
}

function aliasKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(tx\)/gi, " texas ")
    .replace(/\(texas\)/gi, " texas ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isDenisonName(displayName: string): boolean {
  const key = aliasKey(displayName);
  return key === "denison" || key.startsWith("denison ");
}

/**
 * Resolve a ranking school to a stable local logo (or initials fallback).
 * Exact-name map only — never fuzzy-match another school's mark.
 */
export function resolveRankingSchoolLogo(schoolName: string): SchoolLogoResolution {
  const displayName = normalizeRankingSchoolName(schoolName);
  const denison = isDenisonName(displayName);
  if (denison) {
    return {
      schoolName,
      displayName,
      logoSrc: DENISON_BRAND_LOGO_SRC,
      initials: "DU",
      resolved: true,
      isDenison: true,
    };
  }

  const identity = resolveSchoolIdentityFromLabelExact(displayName);
  if (identity?.logoSrc) {
    return {
      schoolName,
      displayName,
      logoSrc: identity.logoSrc,
      initials: initialsFromName(displayName),
      resolved: true,
      isDenison: false,
    };
  }

  return {
    schoolName,
    displayName,
    logoSrc: null,
    initials: initialsFromName(displayName),
    resolved: false,
    isDenison: false,
  };
}

export function listUnresolvedRankingLogos(
  schoolNames: readonly string[],
): SchoolLogoResolution[] {
  return schoolNames
    .map((name) => resolveRankingSchoolLogo(name))
    .filter((resolution) => !resolution.resolved);
}

/** Exposed for tests — confirms logo paths stay under the local asset root. */
export function isLocalSchoolLogoPath(src: string | null): boolean {
  return Boolean(src?.startsWith(`${SCHOOL_LOGOS_BASE_PATH}/`));
}
