import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isTournamentDateLine, normalizeTrnTournamentDate } from "./tournamentDate";
import { parseTrnPaste } from "./parseTrnPaste";

describe("tournamentDate", () => {
  it("normalizes August 31, 2026", () => {
    assert.equal(isTournamentDateLine("August 31, 2026"), true);
    assert.equal(normalizeTrnTournamentDate("August 31, 2026"), "2026-08-31");
  });

  it("normalizes August 21-24, 2026 to start date", () => {
    assert.equal(isTournamentDateLine("August 21-24, 2026"), true);
    assert.equal(normalizeTrnTournamentDate("August 21-24, 2026"), "2026-08-21");
  });

  it("normalizes July 5, 2026", () => {
    assert.equal(normalizeTrnTournamentDate("July 5, 2026"), "2026-07-05");
  });

  it("normalizes July 5-13, 2026 to start date", () => {
    assert.equal(isTournamentDateLine("July 5-13, 2026"), true);
    assert.equal(normalizeTrnTournamentDate("July 5-13, 2026"), "2026-07-05");
  });

  it("normalizes August 30-September 2, 2026 to start date", () => {
    assert.equal(isTournamentDateLine("August 30-September 2, 2026"), true);
    assert.equal(normalizeTrnTournamentDate("August 30-September 2, 2026"), "2026-08-30");
  });

  it("rejects invalid or unrecognized date text", () => {
    for (const line of [
      "Summer 2026",
      "August 31 2026",
      "31 August, 2026",
      "Complete Results",
      "Not a date",
    ]) {
      assert.equal(isTournamentDateLine(line), false, line);
      assert.equal(normalizeTrnTournamentDate(line), null, line);
    }
  });

  it("returns null for structurally valid but unknown month names", () => {
    assert.equal(isTournamentDateLine("Augus 31, 2026"), true);
    assert.equal(normalizeTrnTournamentDate("Augus 31, 2026"), null);
  });

  it("parses a single-date tournament block with one match", () => {
    const parsed = parseTrnPaste(`
DENISON OS TEST EVENT
August 31, 2026
Columbus, OH    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
QF    Test Opponent (75)         6-4 6-3
`.trim());

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.tournamentDate, "August 31, 2026");
    assert.equal(normalizeTrnTournamentDate(parsed[0]?.tournamentDate), "2026-08-31");
  });
});

describe("Day 2 synthetic fixture date", () => {
  it('uses natural "August 31, 2026" format', () => {
    const parsed = parseTrnPaste(`
DENISON OS TEST EVENT
August 31, 2026
Columbus, OH    Boys' 18 & Under Singles
Complete Results

Round    Wins    Losses    Score
QF    Test Opponent (75)         6-4 6-3
`.trim());

    assert.equal(parsed.length, 1);
    assert.equal(normalizeTrnTournamentDate("August 31, 2026"), "2026-08-31");
    assert.notEqual(normalizeTrnTournamentDate("August 31, 2026"), "2031-08-31");
  });
});
