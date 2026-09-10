import {
  DENISON_BRAND_LOGO_SRC,
  SCHOOL_LOGOS_BASE_PATH,
  schoolLogoSrc,
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
 * Exact ITA snapshot display names (after gender-suffix strip) → local logo file.
 * No fuzzy matching — only these keys resolve for Rankings.
 */
export const CURRENT_ITA_SCHOOL_LOGO_BY_DISPLAY_NAME: Readonly<
  Record<string, string>
> = {
  "University Of Chicago": "chicago.svg",
  "Claremont-Mudd-Scripps": "claremont-m-s.svg",
  Tufts: "tufts-jumbos-logo-png_seeklogo-326178.png",
  Denison: "Denison_transparent.png",
  "Case Western Reserve": "case-western-reserve-spartans-logo-png_seeklogo-436095.png",
  Bowdoin: "bowdoin.svg",
  Swarthmore: "swarthmore.svg",
  "Johns Hopkins": "johns-hopkins.svg",
  "Carnegie Mellon": "carnegie-mellon-logo-png_seeklogo-404230.png",
  "Emory (GA)": "emory.svg",
  Kenyon: "kenyon-logo.png",
  Babson: "babson.svg",
  "Washington University In St. Louis": "Athletic_WashU_Logo_RGB.jpg",
  "Mary Washington":
    "mary-washington-university-of-mary-washington-mascot-11562990064vz2rof1zel.png",
  Sewanee: "sewanee.svg",
  "Trinity (Texas)": "trinity-tx.svg",
  "Amherst College": "amherst.svg",
  Brandeis: "Brandeis_athletics_logo_2024.png",
  Middlebury: "middlebury.svg",
  "Pomona-Pitzer": "pomona-pitzer.svg",
  Grinnell: "grinnell.svg",
  Skidmore: "Skidmore College.png",
  "Gustavus Adolphus": "gust-adolphus.svg",
  "Williams College": "williams.svg",
  NYU: "new-york-u.svg",
  Oberlin: "Oberlin_logo_from_NCAA.svg.webp",
  "Christopher Newport": "chris-newport.svg",
  Carthage: "carthage.svg",
  "Vassar College": "vassar.svg",
  Kalamazoo: "kalamazoo.svg",
  DePauw: "depauw-tigers-logo-png_seeklogo-454736.png",
  "Wisconsin-Whitewater": "wis-whitewater.svg",
  "Washington and Lee": "wash-lee.svg",
  "Southwestern (Texas)": "southwestern-tx.svg",
  "North Central (IL)": "north-central-il.svg",
  "Luther College": "luther.svg",
  "North Carolina Wesleyan University": "nc-wesleyan.svg",
  "The College Of New Jersey": "tcnj.svg",
  "Massachusetts Inst. Of Tech.": "mit.svg",
  "Lake Forest": "lake-forest.svg",
  Redlands: "redlands.svg",
  Shenandoah: "shenandoah.svg",
  Haverford: "haverford.svg",
  "Stevens Institute Of Technology": "stevens.svg",
  "Franklin & Marshall College": "franklin-marshall.svg",
  Carleton: "carleton.svg",
  Bates: "bates.svg",
  "Wesleyan University": "wesleyan-ct.svg",
  "Randolph College": "randolph.svg",
  Ithaca: "ithaca.svg",
  Caltech: "caltech.svg",
  Wabash: "Wabash_athletics_logo.png",
  Hamilton: "hamilton.svg",
  "Ohio Northern": "ohio-northern.svg",
  "Union (New York)": "union-ny.svg",
  "Hope College": "hope.svg",
  "Coe College": "coe.svg",
  Averett: "averett.svg",
  "Rochester (New York)": "rochester-ny.svg",
  Rhodes: "rhodes.svg",
  Chapman: "chapman.svg",
  Asbury: "asbury.svg",
  "Virginia Wesleyan University": "va-wesleyan.svg",
  "East Texas Baptist": "east-tex-baptist.svg",
  "Rochester Inst. Of Tech.": "rit.svg",
  Occidental: "occidental.svg",
  "Illinois Institute Of Technology": "iit.svg",
  "Washington College": "washington-col.svg",
  "Hobart/William Smith": "hobart.svg",
  "Colby College": "colby.svg",
  "Bethel (MN)": "bethel-mn.svg",
  "Mary Hardin-Baylor": "mary-hardin-baylor.svg",
  "Whitman College": "whitman.svg",
  Allegheny: "allegheny.svg",
  "Rose-Hulman": "rose-hulman.svg",
};

/** Filenames that already existed in the OS shared library before Rankings coverage. */
export const PREEXISTING_OS_SCHOOL_LOGO_FILES = [
  "tufts-jumbos-logo-png_seeklogo-326178.png",
  "Denison_transparent.png",
  "case-western-reserve-spartans-logo-png_seeklogo-436095.png",
  "carnegie-mellon-logo-png_seeklogo-404230.png",
  "kenyon-logo.png",
  "Athletic_WashU_Logo_RGB.jpg",
  "mary-washington-university-of-mary-washington-mascot-11562990064vz2rof1zel.png",
  "trinity-tx.svg",
  "Brandeis_athletics_logo_2024.png",
  "Skidmore College.png",
  "Oberlin_logo_from_NCAA.svg.webp",
  "depauw-tigers-logo-png_seeklogo-454736.png",
  "Wabash_athletics_logo.png",
] as const;

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

  const logoFile = CURRENT_ITA_SCHOOL_LOGO_BY_DISPLAY_NAME[displayName];
  if (logoFile) {
    return {
      schoolName,
      displayName,
      logoSrc: schoolLogoSrc(logoFile),
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

export type RankingLogoCoverageAudit = {
  total: number;
  previouslyResolved: number;
  newlyResolved: number;
  unresolved: number;
  invalidFiles: string[];
  duplicateMappings: string[];
  unusedNewDownloads: string[];
};

/**
 * Counts-only coverage audit for Current ITA logos.
 * `knownNewFilenames` should be the Rankings-era downloads under `public/school-logos/`.
 */
export function auditCurrentItaLogoCoverage(options: {
  schoolNames: readonly string[];
  fileExists: (absoluteOrPublicRelative: string) => boolean;
  knownNewFilenames: readonly string[];
  publicLogoPath: (filename: string) => string;
}): RankingLogoCoverageAudit {
  const preexisting = new Set<string>(PREEXISTING_OS_SCHOOL_LOGO_FILES);
  const mappedFiles = new Set<string>();
  const duplicateMappings: string[] = [];
  let previouslyResolved = 0;
  let newlyResolved = 0;
  let unresolved = 0;
  const invalidFiles: string[] = [];

  for (const schoolName of options.schoolNames) {
    const resolution = resolveRankingSchoolLogo(schoolName);
    if (!resolution.resolved || !resolution.logoSrc) {
      unresolved += 1;
      continue;
    }
    const filename = resolution.logoSrc.slice(`${SCHOOL_LOGOS_BASE_PATH}/`.length);
    if (mappedFiles.has(filename) === false) {
      mappedFiles.add(filename);
    }
    if (!options.fileExists(options.publicLogoPath(filename))) {
      invalidFiles.push(filename);
    }
    if (preexisting.has(filename) || resolution.isDenison) {
      previouslyResolved += 1;
    } else {
      newlyResolved += 1;
    }
  }

  const fileToNames = new Map<string, string[]>();
  for (const [displayName, filename] of Object.entries(
    CURRENT_ITA_SCHOOL_LOGO_BY_DISPLAY_NAME,
  )) {
    const list = fileToNames.get(filename) ?? [];
    list.push(displayName);
    fileToNames.set(filename, list);
  }
  for (const [filename, names] of fileToNames) {
    if (names.length > 1) {
      duplicateMappings.push(`${filename} ← ${names.join(" | ")}`);
    }
  }

  const unusedNewDownloads = options.knownNewFilenames.filter(
    (filename) => !mappedFiles.has(filename) && !preexisting.has(filename),
  );

  return {
    total: options.schoolNames.length,
    previouslyResolved,
    newlyResolved,
    unresolved,
    invalidFiles,
    duplicateMappings,
    unusedNewDownloads: [...unusedNewDownloads],
  };
}
