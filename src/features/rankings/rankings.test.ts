import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  isNavItemActive,
  primaryNavItems,
} from "@/components/nav-items";
import {
  RANKINGS_CURRENT_ITA_ROUTE,
  RANKINGS_CURRENT_NPI_ROUTE,
  RANKINGS_LIVE_ITA_ROUTE,
  RANKINGS_LIVE_NPI_ROUTE,
  RANKINGS_ROUTE,
} from "@/lib/module-routes";

import { filterRankingEntries } from "./search";
import {
  CURRENT_ITA_NEW_SCHOOL_LOGO_FILENAMES,
  CURRENT_ITA_NEW_SCHOOL_LOGO_MANIFEST,
} from "./schoolLogoManifest";
import {
  CURRENT_ITA_SCHOOL_LOGO_BY_DISPLAY_NAME,
  auditCurrentItaLogoCoverage,
  isLocalSchoolLogoPath,
  listUnresolvedRankingLogos,
  normalizeRankingSchoolName,
  resolveRankingSchoolLogo,
} from "./schoolLogos";
import { CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT } from "./snapshot/currentIta";
import { RANKINGS_SUBMODULES } from "./submodules";
import { validateRankingSnapshot } from "./validate";

const PUBLIC_SCHOOL_LOGOS_DIR = path.join(process.cwd(), "public", "school-logos");

const rankings = primaryNavItems.find((item) => item.label === "Rankings");
if (!rankings) throw new Error("expected Rankings nav item");

test("Rankings sits between Recruiting and Fundraising in primary nav", () => {
  const labels = primaryNavItems.map((item) => item.label);
  const recruitingIndex = labels.indexOf("Recruiting");
  const rankingsIndex = labels.indexOf("Rankings");
  const fundraisingIndex = labels.indexOf("Fundraising");
  assert.ok(recruitingIndex >= 0);
  assert.ok(rankingsIndex >= 0);
  assert.ok(fundraisingIndex >= 0);
  assert.equal(rankingsIndex, recruitingIndex + 1);
  assert.equal(fundraisingIndex, rankingsIndex + 1);
});

test("Rankings submodules stay in workspace tabs instead of sidebar children", () => {
  assert.equal(rankings.children, undefined);
  assert.deepEqual(
    RANKINGS_SUBMODULES.map((item) => item.label),
    [
      "Current ITA Rankings",
      "Live ITA Rankings",
      "Current NPI Rankings",
      "Live NPI Rankings",
    ],
  );
  assert.deepEqual(
    RANKINGS_SUBMODULES.map((item) => item.href),
    [
      RANKINGS_CURRENT_ITA_ROUTE,
      RANKINGS_LIVE_ITA_ROUTE,
      RANKINGS_CURRENT_NPI_ROUTE,
      RANKINGS_LIVE_NPI_ROUTE,
    ],
  );
});

test("Rankings parent stays active on submodule routes", () => {
  assert.equal(isNavItemActive(RANKINGS_ROUTE, RANKINGS_ROUTE), true);
  assert.equal(isNavItemActive(RANKINGS_CURRENT_ITA_ROUTE, RANKINGS_ROUTE), true);
  assert.equal(isNavItemActive(RANKINGS_LIVE_NPI_ROUTE, RANKINGS_ROUTE), true);
  assert.equal(isNavItemActive("/fundraising", RANKINGS_ROUTE), false);
});

test("Current ITA snapshot metadata matches June 3 2026 Men DIII National Team", () => {
  const { metadata, entries } = CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT;
  assert.equal(metadata.rankingDate, "2026-06-03");
  assert.equal(metadata.season, "2025-26");
  assert.equal(metadata.gender, "M");
  assert.equal(metadata.division, "DIV3");
  assert.equal(metadata.format, "TEAM");
  assert.equal(metadata.rankingType, "national");
  assert.equal(metadata.totalRankedTeams, 75);
  assert.equal(entries.length, 75);
  assert.match(metadata.sourceUrl, /date=2026-06-03/);
  assert.match(metadata.sourceUrl, /gender=M/);
  assert.match(metadata.sourceUrl, /divisionType=DIV3/);
  assert.match(metadata.sourceUrl, /matchFormat=TEAM/);
  assert.match(metadata.sourceName, /ITA/i);
  assert.ok(metadata.retrievedAt);
});

test("Current ITA snapshot is complete, ordered, and validates", () => {
  const snapshot = validateRankingSnapshot(CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT);
  const ranks = snapshot.entries.map((entry) => entry.rank);
  for (let i = 1; i < ranks.length; i += 1) {
    assert.ok(ranks[i]! >= ranks[i - 1]!, `rank order at ${i}`);
  }
  const names = new Set(snapshot.entries.map((entry) => entry.schoolName));
  assert.equal(names.size, snapshot.entries.length);
});

test("ties are supported by validation", () => {
  const tied = validateRankingSnapshot({
    metadata: {
      ...CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.metadata,
      totalRankedTeams: 2,
      sourceName: "test",
      sourceUrl: "https://example.com",
      rankingDate: "2026-06-03",
      retrievedAt: "2026-09-07T00:00:00Z",
    },
    entries: [
      { rank: 10, schoolName: "Alpha (M)" },
      { rank: 10, schoolName: "Beta (M)" },
    ],
  });
  assert.equal(tied.entries[0]?.rank, 10);
  assert.equal(tied.entries[1]?.rank, 10);
});

test("Denison official rank is 4 with Denison logo", () => {
  const denison = CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.entries.find((entry) =>
    entry.schoolName.toLowerCase().includes("denison"),
  );
  assert.ok(denison);
  assert.equal(denison.rank, 4);
  assert.equal(denison.wins, 27);
  assert.equal(denison.losses, 3);
  assert.equal(denison.points, 78.229);
  assert.equal(denison.wtn, 11.96);
  const logo = resolveRankingSchoolLogo(denison.schoolName);
  assert.equal(logo.isDenison, true);
  assert.equal(logo.resolved, true);
  assert.equal(logo.logoSrc, "/school-logos/Denison_transparent.png");
  assert.equal(normalizeRankingSchoolName(denison.schoolName), "Denison");
});

test("search filters without mutating official rank order", () => {
  const filtered = filterRankingEntries(
    CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.entries,
    "coast",
  );
  assert.ok(filtered.length >= 1);
  for (let i = 1; i < filtered.length; i += 1) {
    assert.ok(filtered[i]!.rank >= filtered[i - 1]!.rank);
  }
  const denisonOnly = filterRankingEntries(
    CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.entries,
    "denison",
  );
  assert.equal(denisonOnly.length, 1);
  assert.equal(denisonOnly[0]?.rank, 4);
});

test("all Current ITA schools use local shared-library logos and never hotlink", () => {
  const unresolved = listUnresolvedRankingLogos(
    CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.entries.map((entry) => entry.schoolName),
  );
  assert.equal(unresolved.length, 0);
  for (const entry of CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.entries) {
    const logo = resolveRankingSchoolLogo(entry.schoolName);
    if (logo.logoSrc) {
      assert.equal(isLocalSchoolLogoPath(logo.logoSrc), true);
      assert.equal(logo.logoSrc.startsWith("http"), false);
    }
  }
});

test("snapshot columns: record and conference present; previous rank absent", () => {
  const { entries } = CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT;
  assert.ok(entries.every((entry) => entry.wins != null && entry.losses != null));
  assert.ok(entries.every((entry) => entry.points != null));
  assert.ok(entries.every((entry) => entry.wtn != null));
  assert.ok(entries.every((entry) => Boolean(entry.conference)));
  assert.ok(entries.every((entry) => entry.previousRank == null));
});

test("ITA gender suffix normalization keeps ambiguous display names exact", () => {
  assert.equal(normalizeRankingSchoolName("Emory (GA) (M)"), "Emory (GA)");
  assert.equal(
    normalizeRankingSchoolName("Massachusetts Inst. Of Tech. (M)"),
    "Massachusetts Inst. Of Tech.",
  );
  assert.equal(normalizeRankingSchoolName("Southwestern (Texas) (M)"), "Southwestern (Texas)");
  assert.equal(normalizeRankingSchoolName("North Central (IL) (M)"), "North Central (IL)");
  assert.equal(normalizeRankingSchoolName("Union (New York) (M)"), "Union (New York)");
  assert.equal(normalizeRankingSchoolName("Rochester (New York) (M)"), "Rochester (New York)");
  assert.equal(normalizeRankingSchoolName("Rochester Inst. Of Tech. (M)"), "Rochester Inst. Of Tech.");
  assert.equal(normalizeRankingSchoolName("Hobart/William Smith (M)"), "Hobart/William Smith");
  assert.equal(normalizeRankingSchoolName("Bethel (MN) (M)"), "Bethel (MN)");
  assert.equal(normalizeRankingSchoolName("The College Of New Jersey (M)"), "The College Of New Jersey");
  assert.equal(normalizeRankingSchoolName("Amherst College (M)"), "Amherst College");
  assert.equal(normalizeRankingSchoolName("University Of Chicago (M)"), "University Of Chicago");
  assert.equal(normalizeRankingSchoolName("Claremont-Mudd-Scripps (M)"), "Claremont-Mudd-Scripps");
  assert.equal(normalizeRankingSchoolName("Wisconsin-Whitewater (M)"), "Wisconsin-Whitewater");
  assert.equal(normalizeRankingSchoolName("Mary Hardin-Baylor (M)"), "Mary Hardin-Baylor");
  assert.equal(normalizeRankingSchoolName("Rose-Hulman (M)"), "Rose-Hulman");
});

test("exact-name logo map covers every Current ITA school without fuzzy collisions", () => {
  const specialCases: Record<string, string> = {
    "University Of Chicago": "chicago.svg",
    "Claremont-Mudd-Scripps": "claremont-m-s.svg",
    "Emory (GA)": "emory.svg",
    "Amherst College": "amherst.svg",
    "Massachusetts Inst. Of Tech.": "mit.svg",
    "Wisconsin-Whitewater": "wis-whitewater.svg",
    "Southwestern (Texas)": "southwestern-tx.svg",
    "North Central (IL)": "north-central-il.svg",
    "The College Of New Jersey": "tcnj.svg",
    "Union (New York)": "union-ny.svg",
    "Rochester (New York)": "rochester-ny.svg",
    "Rochester Inst. Of Tech.": "rit.svg",
    "Hobart/William Smith": "hobart.svg",
    "Bethel (MN)": "bethel-mn.svg",
    "Mary Hardin-Baylor": "mary-hardin-baylor.svg",
    "Rose-Hulman": "rose-hulman.svg",
  };

  for (const [displayName, filename] of Object.entries(specialCases)) {
    assert.equal(CURRENT_ITA_SCHOOL_LOGO_BY_DISPLAY_NAME[displayName], filename);
    const logo = resolveRankingSchoolLogo(`${displayName} (M)`);
    assert.equal(logo.resolved, true);
    assert.equal(logo.logoSrc, `/school-logos/${filename}`);
  }

  // No fuzzy match: similar names must not steal another school's mark.
  assert.equal(resolveRankingSchoolLogo("Bethel (IN) (M)").resolved, false);
  assert.equal(resolveRankingSchoolLogo("Union (Kentucky) (M)").resolved, false);
  assert.equal(resolveRankingSchoolLogo("Rochester (Michigan) (M)").resolved, false);
  assert.equal(resolveRankingSchoolLogo("Emory & Henry (M)").resolved, false);
  assert.equal(resolveRankingSchoolLogo("Southwestern (Kansas) (M)").resolved, false);
});

test("mapped logo files exist locally and look like valid images", () => {
  for (const entry of CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.entries) {
    const logo = resolveRankingSchoolLogo(entry.schoolName);
    assert.equal(logo.resolved, true, entry.schoolName);
    assert.ok(logo.logoSrc);
    assert.equal(isLocalSchoolLogoPath(logo.logoSrc), true);
    const filename = logo.logoSrc!.slice("/school-logos/".length);
    const filePath = path.join(PUBLIC_SCHOOL_LOGOS_DIR, filename);
    assert.equal(existsSync(filePath), true, filePath);
    const bytes = readFileSync(filePath);
    assert.ok(bytes.length > 200, `${filename} too small`);
    const head = bytes.subarray(0, 64).toString("utf8");
    const isSvg = head.includes("<svg") || head.includes("<?xml");
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isWebp = head.includes("WEBP") || filename.toLowerCase().endsWith(".webp");
    assert.ok(isSvg || isPng || isJpeg || isWebp, `${filename} invalid image header`);
  }
});

test("Current ITA logo coverage audit is 75/75 with clean newly-added assets", () => {
  const schoolNames = CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.entries.map(
    (entry) => entry.schoolName,
  );
  const audit = auditCurrentItaLogoCoverage({
    schoolNames,
    knownNewFilenames: CURRENT_ITA_NEW_SCHOOL_LOGO_FILENAMES,
    fileExists: existsSync,
    publicLogoPath: (filename) => path.join(PUBLIC_SCHOOL_LOGOS_DIR, filename),
  });
  assert.equal(audit.total, 75);
  assert.equal(audit.previouslyResolved, 13);
  assert.equal(audit.newlyResolved, 62);
  assert.equal(audit.unresolved, 0);
  assert.deepEqual(audit.invalidFiles, []);
  assert.deepEqual(audit.duplicateMappings, []);
  assert.deepEqual(audit.unusedNewDownloads, []);
});

test("new school-logo manifest covers Rankings-era assets and stays out of UI imports", () => {
  assert.equal(CURRENT_ITA_NEW_SCHOOL_LOGO_MANIFEST.length, 62);
  const names = new Set(
    CURRENT_ITA_NEW_SCHOOL_LOGO_MANIFEST.map((entry) => entry.itaDisplayName),
  );
  assert.equal(names.size, 62);
  for (const entry of CURRENT_ITA_NEW_SCHOOL_LOGO_MANIFEST) {
    assert.equal(CURRENT_ITA_SCHOOL_LOGO_BY_DISPLAY_NAME[entry.itaDisplayName], entry.localFilename);
    assert.ok(entry.sourcePage.startsWith("https://"));
    assert.ok(["ITA", "official athletics", "official brand", "Wikimedia"].includes(entry.sourceType));
    assert.match(entry.retrievalDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(existsSync(path.join(PUBLIC_SCHOOL_LOGOS_DIR, entry.localFilename)), true);
    if (entry.directAssetUrl) {
      assert.equal(entry.directAssetUrl.startsWith("http"), true);
    }
  }

  const workspaceSource = readFileSync(
    path.join(process.cwd(), "src/features/rankings/components/CurrentItaRankingsWorkspace.tsx"),
    "utf8",
  );
  assert.equal(workspaceSource.includes("schoolLogoManifest"), false);
  assert.equal(workspaceSource.includes("directAssetUrl"), false);
});
