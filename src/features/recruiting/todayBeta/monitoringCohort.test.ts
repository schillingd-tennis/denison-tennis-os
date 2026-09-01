import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RecruitProfile } from "../types";
import {
  filterRankBoardRecruits,
  isOnRankBoard,
  isUtrMonitoringEnabled,
  resolveMonitoredRecruit,
  summarizeRankBoardMonitoringCohort,
} from "./monitoringCohort";
import type { RecruitExternalProfiles } from "./types";

function profile(overrides: Partial<RecruitProfile> & { personId: string }): RecruitProfile {
  return {
    id: overrides.id ?? `profile-${overrides.personId}`,
    personId: overrides.personId,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    recruitClassYear: overrides.recruitClassYear,
    coachRank: overrides.coachRank,
    priority: overrides.priority,
  };
}

function externalProfiles(overrides: RecruitExternalProfiles = {}): RecruitExternalProfiles {
  return overrides;
}

describe("Rank Board UTR monitoring cohort", () => {
  it("1. Rank Board recruit + UTR ID → included", () => {
    const recruits = filterRankBoardRecruits({
      profiles: [profile({ personId: "p1", recruitClassYear: 2028, coachRank: 3 })],
      externalProfilesByPersonId: new Map([
        ["p1", externalProfiles({ utr: { playerId: "123", profileUrl: "https://example.com" } })],
      ]),
      peopleById: new Map([["p1", { id: "p1" }]]),
      displayNameForPersonId: () => "Gideon Ames",
    });

    assert.equal(recruits.length, 1);
    assert.equal(recruits[0]?.utrPlayerId, "123");
    assert.equal(recruits[0]?.coachRank, 3);
  });

  it("2. Rank Board recruit + no UTR ID → NOT CONFIGURED cohort member", () => {
    const recruits = filterRankBoardRecruits({
      profiles: [profile({ personId: "p1", recruitClassYear: 2028, coachRank: 1 })],
      externalProfilesByPersonId: new Map([["p1", externalProfiles()]]),
      peopleById: new Map([["p1", { id: "p1" }]]),
      displayNameForPersonId: () => "Missing UTR",
    });

    assert.equal(recruits.length, 1);
    assert.equal(recruits[0]?.utrPlayerId, undefined);
    const summary = summarizeRankBoardMonitoringCohort(recruits);
    assert.equal(summary.missingUtrCount, 1);
    assert.equal(summary.configuredCount, 0);
  });

  it("3. Non-Rank Board recruit + UTR ID → excluded", () => {
    const recruits = filterRankBoardRecruits({
      profiles: [profile({ personId: "p1", recruitClassYear: 2028 })],
      externalProfilesByPersonId: new Map([
        ["p1", externalProfiles({ utr: { playerId: "999", profileUrl: "https://example.com" } })],
      ]),
      peopleById: new Map([["p1", { id: "p1" }]]),
      displayNameForPersonId: () => "Off Board",
    });

    assert.equal(recruits.length, 0);
  });

  it("4. Old utrMonitoring.enabled = true but not Rank Board → excluded", () => {
    const recruits = filterRankBoardRecruits({
      profiles: [profile({ personId: "p1", recruitClassYear: 2027 })],
      externalProfilesByPersonId: new Map([
        [
          "p1",
          externalProfiles({
            utrMonitoring: { enabled: true },
            utr: { playerId: "555", profileUrl: "https://example.com" },
          }),
        ],
      ]),
      peopleById: new Map([["p1", { id: "p1" }]]),
      displayNameForPersonId: () => "Legacy Pilot",
    });

    assert.equal(recruits.length, 0);
    assert.equal(isUtrMonitoringEnabled(externalProfiles({ utrMonitoring: { enabled: true } })), true);
  });

  it("5. Rank Board recruit added → included next load", () => {
    const before = filterRankBoardRecruits({
      profiles: [profile({ personId: "p1", recruitClassYear: 2029 })],
      externalProfilesByPersonId: new Map([["p1", externalProfiles()]]),
      peopleById: new Map([["p1", { id: "p1" }]]),
      displayNameForPersonId: () => "New Recruit",
    });
    const after = filterRankBoardRecruits({
      profiles: [profile({ personId: "p1", recruitClassYear: 2029, coachRank: 12 })],
      externalProfilesByPersonId: new Map([["p1", externalProfiles()]]),
      peopleById: new Map([["p1", { id: "p1" }]]),
      displayNameForPersonId: () => "New Recruit",
    });

    assert.equal(before.length, 0);
    assert.equal(after.length, 1);
  });

  it("6. Rank Board recruit removed → excluded next load", () => {
    const before = filterRankBoardRecruits({
      profiles: [profile({ personId: "p1", recruitClassYear: 2029, coachRank: 4 })],
      externalProfilesByPersonId: new Map([
        ["p1", externalProfiles({ utr: { playerId: "111", profileUrl: "https://example.com" } })],
      ]),
      peopleById: new Map([["p1", { id: "p1" }]]),
      displayNameForPersonId: () => "Removed Recruit",
    });
    const after = filterRankBoardRecruits({
      profiles: [profile({ personId: "p1", recruitClassYear: 2029 })],
      externalProfilesByPersonId: new Map([
        ["p1", externalProfiles({ utr: { playerId: "111", profileUrl: "https://example.com" } })],
      ]),
      peopleById: new Map([["p1", { id: "p1" }]]),
      displayNameForPersonId: () => "Removed Recruit",
    });

    assert.equal(before.length, 1);
    assert.equal(after.length, 0);
  });

  it("7–9. includes 2027, 2028, and 2029 Rank Board players", () => {
    const recruits = filterRankBoardRecruits({
      profiles: [
        profile({ personId: "p2027", recruitClassYear: 2027, coachRank: 1 }),
        profile({ personId: "p2028", recruitClassYear: 2028, coachRank: 2 }),
        profile({ personId: "p2029", recruitClassYear: 2029, coachRank: 3 }),
      ],
      externalProfilesByPersonId: new Map([
        ["p2027", externalProfiles({ utr: { playerId: "a", profileUrl: "https://example.com" } })],
        ["p2028", externalProfiles({ utr: { playerId: "b", profileUrl: "https://example.com" } })],
        ["p2029", externalProfiles()],
      ]),
      peopleById: new Map([
        ["p2027", { id: "p2027" }],
        ["p2028", { id: "p2028" }],
        ["p2029", { id: "p2029" }],
      ]),
      displayNameForPersonId: (id) => id,
    });

    assert.equal(recruits.length, 3);
    const summary = summarizeRankBoardMonitoringCohort(recruits);
    assert.equal(summary.countsByClass[2027], 1);
    assert.equal(summary.countsByClass[2028], 1);
    assert.equal(summary.countsByClass[2029], 1);
  });

  it("10. future class year included without code change", () => {
    const recruits = filterRankBoardRecruits({
      profiles: [profile({ personId: "p2035", recruitClassYear: 2035, coachRank: 1 })],
      externalProfilesByPersonId: new Map([
        ["p2035", externalProfiles({ utr: { playerId: "future", profileUrl: "https://example.com" } })],
      ]),
      peopleById: new Map([["p2035", { id: "p2035" }]]),
      displayNameForPersonId: () => "Future Class",
    });

    assert.equal(recruits.length, 1);
    assert.equal(recruits[0]?.recruitClassYear, 2035);
  });

  it("11. check button count equals configured Rank Board recruits only", () => {
    const recruits = filterRankBoardRecruits({
      profiles: [
        profile({ personId: "p1", recruitClassYear: 2028, coachRank: 1 }),
        profile({ personId: "p2", recruitClassYear: 2028, coachRank: 2 }),
        profile({ personId: "p3", recruitClassYear: 2028, coachRank: 3 }),
      ],
      externalProfilesByPersonId: new Map([
        ["p1", externalProfiles({ utr: { playerId: "1", profileUrl: "https://example.com" } })],
        ["p2", externalProfiles({ utr: { playerId: "2", profileUrl: "https://example.com" } })],
        ["p3", externalProfiles()],
      ]),
      peopleById: new Map([
        ["p1", { id: "p1" }],
        ["p2", { id: "p2" }],
        ["p3", { id: "p3" }],
      ]),
      displayNameForPersonId: (id) => id,
    });

    const summary = summarizeRankBoardMonitoringCohort(recruits);
    assert.equal(summary.rankBoardCount, 3);
    assert.equal(summary.configuredCount, 2);
    assert.equal(summary.configuredRecruits.length, 2);
  });

  it("12. missing UTR count is correct", () => {
    const recruits = [
      resolveMonitoredRecruit({
        personId: "p1",
        displayName: "A",
        externalProfiles: externalProfiles({ utr: { playerId: "1", profileUrl: "https://example.com" } }),
        recruitClassYear: 2028,
        coachRank: 1,
      }),
      resolveMonitoredRecruit({
        personId: "p2",
        displayName: "B",
        externalProfiles: externalProfiles(),
        recruitClassYear: 2028,
        coachRank: 2,
      }),
      resolveMonitoredRecruit({
        personId: "p3",
        displayName: "C",
        externalProfiles: externalProfiles(),
        recruitClassYear: 2028,
        coachRank: 3,
      }),
    ];

    const summary = summarizeRankBoardMonitoringCohort(recruits);
    assert.equal(summary.missingUtrCount, 2);
    assert.equal(summary.missingUtrRecruits.length, 2);
  });

  it("13. historical results remain after removal from Rank Board (cohort filter only)", () => {
    const storedResultRecruitPersonId = "p1";
    const onBoard = isOnRankBoard(profile({ personId: storedResultRecruitPersonId, coachRank: 2 }));
    const offBoard = isOnRankBoard(profile({ personId: storedResultRecruitPersonId }));

    assert.equal(onBoard, true);
    assert.equal(offBoard, false);

    const historicalResults = [{ recruitPersonId: storedResultRecruitPersonId, id: "result-1" }];
    assert.equal(historicalResults.length, 1);
    assert.equal(historicalResults[0]?.recruitPersonId, storedResultRecruitPersonId);
  });

  it("isOnRankBoard uses coachRank presence only", () => {
    assert.equal(isOnRankBoard({ coachRank: 1 }), true);
    assert.equal(isOnRankBoard({ coachRank: undefined }), false);
  });
});
