import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findCrossSourceMatch, outcomeFromUtrIsWinner } from "./crossSourceMatch";
import { isBaselineEstablished, detectionStatusForImport } from "./detectionStatus";
import {
  normalizeUtrApiResults,
  type UtrApiResultsPayload,
} from "./normalizeUtrCapture";
import { reconstructUtrScore } from "./reconstructUtrScore";
import {
  applyCheckedNoNewToUtrProfile,
  applyImportCheckToUtrProfile,
  buildUtrExternalProfile,
} from "./utrProfile";
import { deriveCombinedMonitoringStatus } from "./resultsCheckStatus";
import type { RecruitExternalProfiles, RecruitMatchResult } from "./types";

const ISAAC_PERSON_ID = "recruit-xlsx-row-441";

function trnResult(overrides: Partial<RecruitMatchResult>): RecruitMatchResult {
  return {
    id: overrides.id ?? "trn-1",
    recruitPersonId: ISAAC_PERSON_ID,
    source: "trn_manual",
    tournamentName: "L3 Ellesse Jr. Chmp. at the Cincinnati O",
    tournamentDate: "2026-08-21",
    round: "16",
    opponentName: "Adam Roman",
    opponentRanking: "188",
    score: "7-6(5) 6-3",
    result: "WIN",
    firstDetectedAt: "2026-08-25T12:00:00.000Z",
    lastVerifiedAt: "2026-08-25T12:00:00.000Z",
    detectionStatus: "BASELINE",
    resultFingerprint: "fp-adam",
    needsReview: false,
    parseWarnings: [],
    ...overrides,
  };
}

function isaacUtrPayload(): UtrApiResultsPayload {
  return {
    events: [
      {
        id: 101,
        name: "Ellesse Jr. Championship",
        startDate: "2026-08-21",
        results: [
          {
            id: 9001,
            date: "2026-08-21",
            round: { code: "16" },
            isWinner: true,
            players: {
              winner1: {
                id: 3186547,
                firstName: "Isaac",
                lastName: "Lewis",
                singlesUtr: 11.08,
              },
              loser1: {
                id: 555,
                firstName: "Adam",
                lastName: "Roman",
                singlesUtr: 10.42,
              },
            },
            winnerSet1: 7,
            loserSet1: 6,
            tiebreakerSet1: 5,
            winnerSet2: 6,
            loserSet2: 3,
          },
          {
            id: 9002,
            date: "2026-08-21",
            round: { code: "QF" },
            isWinner: false,
            matchOutcome: "RETIRED",
            players: {
              winner1: {
                id: 777,
                firstName: "Ezra",
                lastName: "Britton",
                singlesUtr: 10.9,
              },
              loser1: {
                id: 3186547,
                firstName: "Isaac",
                lastName: "Lewis",
                singlesUtr: 11.08,
              },
            },
            winnerSet1: 2,
            loserSet1: 2,
          },
        ],
      },
    ],
  };
}

describe("UTR capture v0.1", () => {
  it("1. UTR external profile storage", () => {
    const profile = buildUtrExternalProfile({ playerId: "3186547" });
    assert.equal(profile.playerId, "3186547");
    assert.match(profile.resultsUrl, /3186547\?t=2$/);
  });

  it("2. UTR result normalization", () => {
    const rows = normalizeUtrApiResults({
      payload: isaacUtrPayload(),
      recruitPersonId: ISAAC_PERSON_ID,
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.opponentName, "Adam Roman");
    assert.equal(rows[0]?.externalMatchId, "9001");
  });

  it("3. WIN detection", () => {
    assert.equal(outcomeFromUtrIsWinner(true), "WIN");
    const rows = normalizeUtrApiResults({
      payload: isaacUtrPayload(),
      recruitPersonId: ISAAC_PERSON_ID,
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });
    assert.equal(rows[0]?.result, "WIN");
  });

  it("4. LOSS detection", () => {
    assert.equal(outcomeFromUtrIsWinner(false), "LOSS");
    const rows = normalizeUtrApiResults({
      payload: isaacUtrPayload(),
      recruitPersonId: ISAAC_PERSON_ID,
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });
    assert.equal(rows[1]?.result, "LOSS");
  });

  it("5. UTR score reconstruction", () => {
    const score = reconstructUtrScore({
      sets: [
        { recruitGames: 6, opponentGames: 1 },
        { recruitGames: 6, opponentGames: 0 },
      ],
    });
    assert.equal(score.score, "6-1 6-0");
    assert.equal(score.needsReview, false);
  });

  it("6. Retirement handling", () => {
    const score = reconstructUtrScore({
      sets: [{ recruitGames: 2, opponentGames: 2 }],
      matchStatus: "RETIRED",
    });
    assert.match(score.score, /Ret\./);
  });

  it("7. Opponent UTR stored separately from TRN ranking", () => {
    const rows = normalizeUtrApiResults({
      payload: isaacUtrPayload(),
      recruitPersonId: ISAAC_PERSON_ID,
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });
    assert.equal(rows[0]?.opponentUtr, "10.42");
    assert.equal(rows[0]?.recruitUtr, "11.08");
  });

  it("8. First UTR capture baseline behavior", () => {
    const profiles: RecruitExternalProfiles = {};
    assert.equal(isBaselineEstablished(profiles), false);
    assert.equal(detectionStatusForImport(false), "BASELINE");
  });

  it("9. Existing TRN match + same UTR match does not create duplicate", () => {
    const existing = [trnResult({})];
    const utrRow = normalizeUtrApiResults({
      payload: isaacUtrPayload(),
      recruitPersonId: ISAAC_PERSON_ID,
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    })[0]!;

    const match = findCrossSourceMatch(existing, {
      opponentName: utrRow.opponentName,
      tournamentName: utrRow.tournamentName,
      tournamentDate: utrRow.matchDate,
      score: utrRow.score,
      round: utrRow.round,
    });

    assert.equal(match.kind, "confident");
  });

  it("10. Later unseen UTR match becomes NEW", () => {
    const profiles: RecruitExternalProfiles = {
      trn: { playerId: "971115", profileUrl: "https://example.com", baselineEstablishedAt: "2026-08-20T00:00:00.000Z" },
    };
    assert.equal(detectionStatusForImport(isBaselineEstablished(profiles)), "NEW");
  });

  it("11. Successful capture updates UTR lastCheckedAt", () => {
    const before = buildUtrExternalProfile({ playerId: "3186547" });
    const after = applyImportCheckToUtrProfile(before, "2026-09-01T12:00:00.000Z", 0);
    assert.equal(after.lastCheckedAt, "2026-09-01T12:00:00.000Z");
    assert.equal(after.lastImportedAt, "2026-09-01T12:00:00.000Z");
  });

  it("12. Successful capture updates overall checked-today status", () => {
    const NOW = new Date("2026-09-01T14:00:00.000Z");
    const status = deriveCombinedMonitoringStatus({
      trn: undefined,
      utr: {
        playerId: "3186547",
        profileUrl: "https://example.com",
        resultsUrl: "https://example.com?t=2",
        lastCheckedAt: "2026-09-01T08:00:00.000Z",
        lastCheckSavedNewCount: 0,
      },
      now: NOW,
    });
    assert.equal(status, "CHECKED_TODAY");
  });

  it("13. Checked — No New Results still works", () => {
    const profile = buildUtrExternalProfile({
      playerId: "3186547",
      existing: { lastImportedAt: "2026-08-20T00:00:00.000Z", lastCheckSavedNewCount: 2, playerId: "3186547", profileUrl: "", resultsUrl: "" },
    });
    const after = applyCheckedNoNewToUtrProfile(profile, "2026-09-01T09:00:00.000Z");
    assert.equal(after.lastCheckedAt, "2026-09-01T09:00:00.000Z");
    assert.equal(after.lastImportedAt, profile.lastImportedAt);
    assert.equal(after.lastCheckSavedNewCount, 0);
  });

  it("14. Ambiguous cross-source match does not auto-merge", () => {
    const existing = [trnResult({ score: "6-4 6-2" })];
    const match = findCrossSourceMatch(existing, {
      opponentName: "Adam Roman",
      tournamentName: "Ellesse Jr. Championship",
      tournamentDate: "2026-08-21",
      score: "7-6(5) 6-3",
    });
    assert.equal(match.kind, "ambiguous");
  });

  it("15. Isaac proof-of-concept yields no duplicate rows for already-known matches", () => {
    const existing = [
      trnResult({ opponentName: "Adam Roman", score: "7-6(5) 6-3" }),
      trnResult({ id: "trn-2", opponentName: "Ezra Britton", score: "2-2 Ret.", result: "LOSS", round: "QF" }),
    ];
    const utrRows = normalizeUtrApiResults({
      payload: isaacUtrPayload(),
      recruitPersonId: ISAAC_PERSON_ID,
      utrPlayerId: "3186547",
      recruitName: "Isaac Lewis",
    });

    let confidentMatches = 0;
    let wouldInsert = 0;
    for (const row of utrRows) {
      const match = findCrossSourceMatch(existing, {
        opponentName: row.opponentName,
        tournamentName: row.tournamentName,
        tournamentDate: row.matchDate,
        score: row.score,
        round: row.round,
      });
      if (match.kind === "confident") confidentMatches += 1;
      else if (match.kind === "none") wouldInsert += 1;
    }

    assert.equal(confidentMatches, 2);
    assert.equal(wouldInsert, 0);
  });
});
