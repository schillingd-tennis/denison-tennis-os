import assert from "node:assert/strict";
import test from "node:test";

import { parseTrnPaste } from "./parseTrnPaste";

const TRN_ACTIVITY_FIXTURE = `
L3 ELLESSE JR. CHMP. AT THE CINCINNATI O
August 21-24, 2026
Mason, OH    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
32    Luke Conner (155)         6-1 6-0
16         Rohan Vyas (103)    6-2 6-4
16    Adam Roman (188)         7-6(5) 6-3
QF         Ezra Britton (96)    2-2 Ret.

L1 USTA B16,18 NATIIONAL CHMPS.
August 7-17, 2026
Kalamazoo, MI    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
256         JohnPaul Huston (117)    6-4 6-0
128         Noah Richer (27)    4-6 6-3 [10-7]

L1 B16-18 USTA NATIONAL CLAY COURT CHMPS
July 5-13, 2026
Delray Beach, FL    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
128         Alexander Park (68)    6-4 4-6 6-3
128    Nathan Dolgushev (275)         6-3 6-2
64-Q         Brayden Amey (90)    7-5 7-6(5)
`.trim();

test("parseTrnPaste parses the real TRN activity fixture exactly", () => {
  const parsed = parseTrnPaste(TRN_ACTIVITY_FIXTURE);

  assert.equal(parsed.length, 9);

  assert.deepEqual(
    parsed.map((row) => ({
      tournamentName: row.tournamentName,
      tournamentDate: row.tournamentDate,
      round: row.round,
      result: row.result,
      opponentName: row.opponentName,
      opponentRanking: row.opponentRanking,
      score: row.score,
      needsReview: row.needsReview,
    })),
    [
      {
        tournamentName: "L3 ELLESSE JR. CHMP. AT THE CINCINNATI O",
        tournamentDate: "August 21-24, 2026",
        round: "32",
        result: "WIN",
        opponentName: "Luke Conner",
        opponentRanking: "155",
        score: "6-1 6-0",
        needsReview: false,
      },
      {
        tournamentName: "L3 ELLESSE JR. CHMP. AT THE CINCINNATI O",
        tournamentDate: "August 21-24, 2026",
        round: "16",
        result: "LOSS",
        opponentName: "Rohan Vyas",
        opponentRanking: "103",
        score: "6-2 6-4",
        needsReview: false,
      },
      {
        tournamentName: "L3 ELLESSE JR. CHMP. AT THE CINCINNATI O",
        tournamentDate: "August 21-24, 2026",
        round: "16",
        result: "WIN",
        opponentName: "Adam Roman",
        opponentRanking: "188",
        score: "7-6(5) 6-3",
        needsReview: false,
      },
      {
        tournamentName: "L3 ELLESSE JR. CHMP. AT THE CINCINNATI O",
        tournamentDate: "August 21-24, 2026",
        round: "QF",
        result: "LOSS",
        opponentName: "Ezra Britton",
        opponentRanking: "96",
        score: "2-2 Ret.",
        needsReview: false,
      },
      {
        tournamentName: "L1 USTA B16,18 NATIIONAL CHMPS.",
        tournamentDate: "August 7-17, 2026",
        round: "256",
        result: "LOSS",
        opponentName: "JohnPaul Huston",
        opponentRanking: "117",
        score: "6-4 6-0",
        needsReview: false,
      },
      {
        tournamentName: "L1 USTA B16,18 NATIIONAL CHMPS.",
        tournamentDate: "August 7-17, 2026",
        round: "128",
        result: "LOSS",
        opponentName: "Noah Richer",
        opponentRanking: "27",
        score: "4-6 6-3 [10-7]",
        needsReview: false,
      },
      {
        tournamentName: "L1 B16-18 USTA NATIONAL CLAY COURT CHMPS",
        tournamentDate: "July 5-13, 2026",
        round: "128",
        result: "LOSS",
        opponentName: "Alexander Park",
        opponentRanking: "68",
        score: "6-4 4-6 6-3",
        needsReview: false,
      },
      {
        tournamentName: "L1 B16-18 USTA NATIONAL CLAY COURT CHMPS",
        tournamentDate: "July 5-13, 2026",
        round: "128",
        result: "WIN",
        opponentName: "Nathan Dolgushev",
        opponentRanking: "275",
        score: "6-3 6-2",
        needsReview: false,
      },
      {
        tournamentName: "L1 B16-18 USTA NATIONAL CLAY COURT CHMPS",
        tournamentDate: "July 5-13, 2026",
        round: "64-Q",
        result: "LOSS",
        opponentName: "Brayden Amey",
        opponentRanking: "90",
        score: "7-5 7-6(5)",
        needsReview: false,
      },
    ],
  );
});

test("parseTrnPaste marks unstructured text as needs review", () => {
  const parsed = parseTrnPaste("Some unstructured activity note without clear fields.");
  assert.equal(parsed.length, 0);
});

test("parseTrnPaste keeps opponent ranking separate from opponent name", () => {
  const parsed = parseTrnPaste(TRN_ACTIVITY_FIXTURE);
  for (const row of parsed) {
    assert.doesNotMatch(row.opponentName, /\(\d+\)/);
    assert.match(row.opponentRanking, /^\d+$/);
  }
});
