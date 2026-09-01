import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildLatestResultEntry,
  buildOpponentPersonIndex,
} from "./latestResultOpponentContext";
import {
  additionalRecentResults,
  compareLatestResultRows,
  compareResultsByRecency,
  pickLatestResult,
  RESULT_OUTCOME_TONE_CLASS,
  resultOutcomeLabel,
  resultOutcomeToneClass,
  sortLatestResultRows,
  sortResultsByRecency,
} from "./latestResults";
import type { LatestResultEntry, LatestResultRow, RecruitMatchResult } from "./types";

const NOW = new Date("2026-09-01T12:00:00.000Z");
const EMPTY_INDEX = buildOpponentPersonIndex({ people: [], profiles: [] });

function match(overrides: Partial<RecruitMatchResult>): RecruitMatchResult {
  return {
    id: overrides.id ?? "m1",
    recruitPersonId: "p1",
    source: "trn_manual",
    result: "WIN",
    firstDetectedAt: "2026-08-01T12:00:00.000Z",
    lastVerifiedAt: "2026-08-01T12:00:00.000Z",
    detectionStatus: "BASELINE",
    resultFingerprint: "fp",
    needsReview: false,
    parseWarnings: [],
    ...overrides,
  };
}

function entryFor(result: RecruitMatchResult): LatestResultEntry {
  return buildLatestResultEntry({ result, opponentIndex: EMPTY_INDEX, now: NOW });
}

function latestRow(
  recruitName: string,
  latest: Partial<RecruitMatchResult> | null,
  recentResults: RecruitMatchResult[] = [],
): LatestResultRow {
  const latestResult = latest ? entryFor(match({ recruitPersonId: recruitName, ...latest })) : null;
  const recentEntries = latestResult
    ? [latestResult, ...recentResults.map((row) => entryFor(match({ recruitPersonId: recruitName, ...row })))]
    : recentResults.map((row) => entryFor(match({ recruitPersonId: recruitName, ...row })));
  return {
    recruitPersonId: recruitName,
    recruitName,
    latestResult,
    recentResults: recentEntries,
  };
}

describe("latestResults", () => {
  it("picks the most recent tournament date as latest result", () => {
    const latest = pickLatestResult([
      match({ id: "old", tournamentDate: "2026-07-05" }),
      match({ id: "new", tournamentDate: "2026-08-24" }),
      match({ id: "mid", tournamentDate: "2026-08-21" }),
    ]);

    assert.equal(latest?.id, "new");
  });

  it("breaks ties by firstDetectedAt", () => {
    const sorted = sortResultsByRecency([
      match({ id: "a", tournamentDate: "2026-08-21", firstDetectedAt: "2026-08-21T10:00:00.000Z" }),
      match({ id: "b", tournamentDate: "2026-08-21", firstDetectedAt: "2026-08-22T10:00:00.000Z" }),
    ]);

    assert.equal(sorted[0]?.id, "b");
  });

  it("2. Sep 1 sorts before Aug 31", () => {
    assert.ok(
      compareResultsByRecency(
        match({ tournamentDate: "2026-08-31" }),
        match({ tournamentDate: "2026-09-01" }),
      ) > 0,
    );
  });

  it("1. Aug 31 sorts before Aug 21", () => {
    assert.ok(
      compareResultsByRecency(
        match({ tournamentDate: "2026-08-21" }),
        match({ tournamentDate: "2026-08-31" }),
      ) > 0,
    );
  });

  it("3. Aug 21 sorts before May 23", () => {
    assert.ok(
      compareResultsByRecency(
        match({ tournamentDate: "2026-05-23" }),
        match({ tournamentDate: "2026-08-21" }),
      ) > 0,
    );
  });

  it("regression: 2026 dates sort Sep 1 → Aug 31 → Aug 21 → May 23", () => {
    const rows = sortLatestResultRows([
      latestRow("May", { id: "may", tournamentDate: "2026-05-23" }),
      latestRow("Aug 21", { id: "aug21", tournamentDate: "2026-08-21" }),
      latestRow("Aug 31", { id: "aug31", tournamentDate: "2026-08-31" }),
      latestRow("Sep 1", { id: "sep1", tournamentDate: "2026-09-01" }),
    ]);

    assert.deepEqual(
      rows.map((row) => row.latestResult?.result.tournamentDate),
      ["2026-09-01", "2026-08-31", "2026-08-21", "2026-05-23"],
    );
  });

  it("4. null dates sort after valid dates", () => {
    assert.ok(
      compareResultsByRecency(
        match({ id: "dated", tournamentDate: "2026-08-21" }),
        match({ id: "null", tournamentDate: undefined }),
      ) < 0,
    );

    const rows = sortLatestResultRows([
      latestRow("No date", { id: "null", tournamentDate: undefined }),
      latestRow("Has date", { id: "dated", tournamentDate: "2026-08-21" }),
    ]);

    assert.equal(rows[0]?.recruitName, "Has date");
    assert.equal(rows[1]?.recruitName, "No date");
  });

  it("tie uses firstDetectedAt descending for Latest Results rows", () => {
    const rows = sortLatestResultRows([
      latestRow("Isaac Lewis", {
        id: "isaac",
        tournamentDate: "2026-08-21",
        firstDetectedAt: "2026-08-21T10:00:00.000Z",
      }),
      latestRow("Alexander Wriedt", {
        id: "alex",
        tournamentDate: "2026-08-21",
        firstDetectedAt: "2026-08-22T10:00:00.000Z",
      }),
    ]);

    assert.equal(rows[0]?.recruitName, "Alexander Wriedt");
    assert.ok(compareLatestResultRows(rows[0]!, rows[1]!) < 0);
  });

  it("16. WIN remains red", () => {
    assert.equal(resultOutcomeLabel("WIN"), "Win");
    assert.equal(resultOutcomeToneClass("WIN"), RESULT_OUTCOME_TONE_CLASS.WIN);
    assert.equal(RESULT_OUTCOME_TONE_CLASS.WIN, "font-semibold text-red-700");
  });

  it("17. LOSS remains green", () => {
    assert.equal(resultOutcomeLabel("LOSS"), "Loss");
    assert.equal(resultOutcomeToneClass("LOSS"), RESULT_OUTCOME_TONE_CLASS.LOSS);
    assert.equal(RESULT_OUTCOME_TONE_CLASS.LOSS, "font-semibold text-green-700");
  });

  it("UNKNOWN remains neutral", () => {
    assert.equal(resultOutcomeToneClass("UNKNOWN"), RESULT_OUTCOME_TONE_CLASS.UNKNOWN);
    assert.equal(RESULT_OUTCOME_TONE_CLASS.UNKNOWN, "font-semibold text-text-secondary");
  });

  it("18. Show 4 more recent still works", () => {
    const recent = sortResultsByRecency([
      match({ id: "r1", tournamentDate: "2026-08-24" }),
      match({ id: "r2", tournamentDate: "2026-08-21" }),
      match({ id: "r3", tournamentDate: "2026-08-18" }),
      match({ id: "r4", tournamentDate: "2026-08-15" }),
      match({ id: "r5", tournamentDate: "2026-08-10" }),
    ]);

    const row: LatestResultRow = {
      recruitPersonId: "p1",
      recruitName: "Isaac Lewis",
      latestResult: entryFor(recent[0]!),
      recentResults: recent.map((resultRow) => entryFor(resultRow)),
    };

    const additional = additionalRecentResults(row);
    assert.equal(additional.length, 4);
    assert.deepEqual(
      additional.map((resultRow) => resultRow.result.id),
      ["r2", "r3", "r4", "r5"],
    );
  });

  it("19. expanded results remain newest-first", () => {
    const recent = sortResultsByRecency([
      match({ id: "newest", tournamentDate: "2026-08-30" }),
      match({ id: "mid", tournamentDate: "2026-08-21" }),
      match({ id: "older", tournamentDate: "2026-08-10" }),
    ]);

    const row: LatestResultRow = {
      recruitPersonId: "p1",
      recruitName: "Isaac Lewis",
      latestResult: entryFor(recent[0]!),
      recentResults: recent.map((resultRow) => entryFor(resultRow)),
    };

    const additional = additionalRecentResults(row);
    assert.deepEqual(
      additional.map((resultRow) => resultRow.result.id),
      ["mid", "older"],
    );
  });

  it("exposes match date on LatestResultEntry opponent context", () => {
    const row = latestRow("Gideon Ames", {
      tournamentDate: "2026-09-01",
      opponentName: "Kayden Kral",
    });
    assert.equal(row.latestResult?.opponent.matchDateLabel, "Sep 1");
  });

  it("Finn Keenan: Ellesse Cincinnati Aug 21 beats Toledo Aug 12 when dates are stored correctly", () => {
    const finnResults = [
      match({
        id: "toledo",
        recruitPersonId: "recruit-xlsx-row-380",
        source: "UTR",
        tournamentName: "The 6th Annual Ray Simon Toledo Tennis Open",
        tournamentDate: "2026-08-12",
        opponentName: "Owen Demuth",
        result: "LOSS",
        externalMatchId: "64399813",
      }),
      match({
        id: "ellesse-qf",
        recruitPersonId: "recruit-xlsx-row-380",
        source: "trn_manual",
        tournamentName: "L3 ELLESSE JR. CHMP. AT THE CINCINNATI O",
        tournamentDate: "2026-08-21",
        opponentName: "Alexander Walker",
        result: "LOSS",
        externalMatchId: "64646746",
        ratingType: "UTR",
      }),
      match({
        id: "ellesse-r32",
        recruitPersonId: "recruit-xlsx-row-380",
        source: "trn_manual",
        tournamentName: "L3 ELLESSE JR. CHMP. AT THE CINCINNATI O",
        tournamentDate: "2026-08-21",
        opponentName: "Ezra Britton",
        result: "LOSS",
        externalMatchId: "64631045",
        ratingType: "UTR",
      }),
      match({
        id: "mississippi",
        recruitPersonId: "recruit-xlsx-row-380",
        source: "UTR",
        tournamentName: "Battle of the Mississippi BG18",
        tournamentDate: "2026-07-24",
        opponentName: "Anders Swenson",
        result: "WIN",
      }),
    ];

    const latest = pickLatestResult(finnResults);
    assert.equal(latest?.tournamentDate, "2026-08-21");
    assert.match(latest?.tournamentName ?? "", /Ellesse/i);

    const staleEllesseDate = finnResults.map((row) =>
      row.id.startsWith("ellesse")
        ? { ...row, tournamentDate: "2024-08-21" }
        : row,
    );
    const staleLatest = pickLatestResult(staleEllesseDate);
    assert.equal(staleLatest?.tournamentDate, "2026-08-12");
    assert.match(staleLatest?.tournamentName ?? "", /Toledo/i);
  });
});
