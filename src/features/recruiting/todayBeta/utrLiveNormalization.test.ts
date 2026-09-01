import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findCrossSourceMatch,
  flipScorePerspective,
  scoresEquivalent,
} from "./crossSourceMatch";
import { detectionStatusForUtrImportRow } from "./detectionStatus";
import { normalizeUtrApiResults } from "./normalizeUtrCapture";
import { countUtrPayloadMatches, filterUtrResultsPayload } from "./utrPayloadWindow";
import { isWalkoverOrDefaultStatus, reconstructUtrScore } from "./reconstructUtrScore";
import type { RecruitMatchResult } from "./types";

function trnRow(overrides: Partial<RecruitMatchResult>): RecruitMatchResult {
  return {
    id: "trn-1",
    recruitPersonId: "recruit-xlsx-row-441",
    source: "trn_manual",
    tournamentName: "L3 ELLESSE JR. CHMP. AT THE CINCINNATI O",
    tournamentDate: "2026-08-21",
    round: "16",
    opponentName: "Adam Roman",
    score: "7-6(5) 6-3",
    result: "WIN",
    firstDetectedAt: "2026-08-25T12:00:00.000Z",
    lastVerifiedAt: "2026-08-25T12:00:00.000Z",
    detectionStatus: "BASELINE",
    resultFingerprint: "fp",
    needsReview: false,
    parseWarnings: [],
    ...overrides,
  };
}

/** Minimal live-shaped UTR API fragment (no auth fields). */
function liveShapePayload() {
  return {
    wins: 2,
    losses: 1,
    events: [
      {
        id: 3465797,
        name: "Ellesse Jr. Championship at the Cincinnati Open",
        startDate: "2026-08-21T00:00:00",
        results: [],
        draws: [
          {
            results: [
              {
                id: 64631034,
                date: "2026-08-21T00:00:00",
                isWinner: true,
                outcome: "completed",
                round: { code: "R32" },
                players: {
                  winner1: {
                    id: "3186547",
                    firstName: "Isaac",
                    lastName: "Lewis",
                    singlesUtr: 10.99,
                  },
                  loser1: {
                    id: "1",
                    firstName: "Luke",
                    lastName: "Conner",
                    singlesUtr: 10.5,
                  },
                },
                score: {
                  "1": { winner: 6, loser: 1, tiebreak: null },
                  "2": { winner: 6, loser: 0, tiebreak: null },
                },
              },
              {
                id: 64631041,
                date: "2026-08-21T00:00:00",
                isWinner: false,
                outcome: "completed",
                round: { code: "R16" },
                players: {
                  winner1: {
                    id: "801903",
                    firstName: "Rohan",
                    lastName: "Vyas",
                    singlesUtr: 11.33,
                  },
                  loser1: {
                    id: "3186547",
                    firstName: "Isaac",
                    lastName: "Lewis",
                    singlesUtr: 10.99,
                  },
                },
                score: {
                  "1": { winner: 6, loser: 2, tiebreak: null },
                  "2": { winner: 6, loser: 4, tiebreak: null },
                },
              },
              {
                id: 9001,
                date: "2026-08-21T00:00:00",
                isWinner: true,
                outcome: "completed",
                round: { code: "C-R16" },
                players: {
                  winner1: {
                    id: "3186547",
                    firstName: "Isaac",
                    lastName: "Lewis",
                    singlesUtr: 10.99,
                  },
                  loser1: {
                    id: "555",
                    firstName: "Adam",
                    lastName: "Roman",
                    singlesUtr: 10.42,
                  },
                },
                score: {
                  "1": { winner: 7, loser: 6, tiebreak: 5, winnerTiebreak: 7 },
                  "2": { winner: 6, loser: 3, tiebreak: null },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("UTR live normalization", () => {
  it("1. parses live score object shape without needs review", () => {
    const rows = normalizeUtrApiResults({
      payload: liveShapePayload(),
      recruitPersonId: "recruit-xlsx-row-441",
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });

    assert.equal(rows.length, 3);
    assert.equal(rows.find((row) => row.opponentName === "Luke Conner")?.score, "6-1 6-0");
    assert.equal(rows.find((row) => row.opponentName === "Adam Roman")?.score, "7-6(5) 6-3");
    assert.equal(rows.filter((row) => row.needsReview).length, 0);
  });

  it("2. score equivalence handles recruit vs winner perspective", () => {
    assert.equal(scoresEquivalent("6-2 6-4", "2-6 4-6"), true);
    assert.equal(scoresEquivalent("4-6 6-3 [10-7]", "6-4 3-6 [7-10]"), true);
    assert.equal(flipScorePerspective("4-6 6-3 [10-7]"), "6-4 3-6 [7-10]");
  });

  it("3. cross-source matches Isaac TRN rows from live UTR normalization", () => {
    const rows = normalizeUtrApiResults({
      payload: liveShapePayload(),
      recruitPersonId: "recruit-xlsx-row-441",
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });

    const adam = rows.find((row) => row.opponentName === "Adam Roman")!;
    const match = findCrossSourceMatch([trnRow({})], {
      opponentName: adam.opponentName,
      tournamentName: adam.tournamentName,
      tournamentDate: adam.matchDate,
      score: adam.score,
    });
    assert.equal(match.kind, "confident");

    const rohan = rows.find((row) => row.opponentName === "Rohan Vyas")!;
    const rohanMatch = findCrossSourceMatch(
      [
        trnRow({
          opponentName: "Rohan Vyas",
          score: "6-2 6-4",
          result: "LOSS",
          round: "16",
        }),
      ],
      {
        opponentName: rohan.opponentName,
        tournamentName: rohan.tournamentName,
        tournamentDate: rohan.matchDate,
        score: rohan.score,
      },
    );
    assert.equal(rohanMatch.kind, "confident");

    const nationalTrn = trnRow({
      tournamentName: "L1 USTA B16,18 NATIIONAL CHMPS.",
      tournamentDate: "2017-08-07",
      opponentName: "Noah Richer",
      score: "4-6 6-3 [10-7]",
      result: "LOSS",
    });
    const noah = rows.find((row) => row.opponentName === "Noah Richer");
    if (noah) {
      const noahMatch = findCrossSourceMatch([nationalTrn], {
        opponentName: noah.opponentName,
        tournamentName: noah.tournamentName,
        tournamentDate: noah.matchDate,
        score: noah.score,
      });
      assert.equal(noahMatch.kind, "confident");
    }
  });

  it("3b. cross-source matches TRN rows when TRN paste date year differs", () => {
    const rows = normalizeUtrApiResults({
      payload: liveShapePayload(),
      recruitPersonId: "recruit-xlsx-row-441",
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });

    const adam = rows.find((row) => row.opponentName === "Adam Roman")!;
    const match = findCrossSourceMatch(
      [trnRow({ tournamentDate: "2024-08-21" })],
      {
        opponentName: adam.opponentName,
        tournamentName: adam.tournamentName,
        tournamentDate: adam.matchDate,
        score: adam.score,
      },
    );
    assert.equal(match.kind, "confident");
  });

  it("4. historical UTR-only rows before baseline import as BASELINE", () => {
    assert.equal(
      detectionStatusForUtrImportRow({
        baselineEstablished: true,
        baselineEstablishedAt: "2026-08-25T00:00:00.000Z",
        matchDate: "2026-07-05",
      }),
      "BASELINE",
    );
    assert.equal(
      detectionStatusForUtrImportRow({
        baselineEstablished: true,
        baselineEstablishedAt: "2026-08-25T00:00:00.000Z",
        matchDate: "2026-09-01",
      }),
      "NEW",
    );
  });

  it("5. monitoring window trims old events from routine import", () => {
    const payload = liveShapePayload();
    const filtered = filterUtrResultsPayload(payload, {
      now: new Date("2026-09-01T12:00:00.000Z"),
      windowDays: 30,
    });
    assert.equal(countUtrPayloadMatches(filtered), 3);

    const empty = filterUtrResultsPayload(payload, {
      now: new Date("2027-01-01T12:00:00.000Z"),
      windowDays: 30,
    });
    assert.equal(countUtrPayloadMatches(empty), 0);
  });

  it("6. walkover/default without set scores normalizes to WO without review", () => {
    assert.equal(isWalkoverOrDefaultStatus("Walkover"), true);
    const score = reconstructUtrScore({
      sets: [],
      matchStatus: "Walkover",
      outcome: "walkover",
    });
    assert.equal(score.score, "WO");
    assert.equal(score.needsReview, false);

    const rows = normalizeUtrApiResults({
      payload: {
        events: [
          {
            id: 1,
            name: "Regional Open",
            startDate: "2026-08-10",
            results: [
              {
                id: 777001,
                date: "2026-08-10",
                outcome: "walkover",
                completionType: "Walkover",
                isWinner: true,
                round: { code: "QF" },
                players: {
                  winner1: {
                    id: 3186547,
                    firstName: "Isaac",
                    lastName: "Lewis",
                  },
                  loser1: {
                    id: 999,
                    firstName: "Reid",
                    lastName: "Ferreira",
                  },
                },
              },
            ],
          },
        ],
      },
      recruitPersonId: "recruit-xlsx-row-441",
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.score, "WO");
    assert.equal(rows[0]?.result, "WIN");
    assert.equal(rows[0]?.needsReview, false);
  });
});
