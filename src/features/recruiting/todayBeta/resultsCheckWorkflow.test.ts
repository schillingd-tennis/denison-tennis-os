import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyCheckedNoNewToTrnProfile,
  applyImportCheckToTrnProfile,
  buildActivitySummary,
  comparePlayersForMonitoringQueue,
  deriveMonitoringStatus,
  formatUtrAgentLastBatchLabel,
  sortPlayersForMonitoringQueue,
} from "./resultsCheckStatus";
import type { TodayBetaPlayerRow, TrnExternalProfile } from "./types";

const NOW = new Date("2026-08-31T14:00:00.000Z");
const TODAY_CHECK = "2026-08-31T08:42:00.000Z";
const YESTERDAY_CHECK = "2026-08-30T10:00:00.000Z";

function trn(overrides: Partial<TrnExternalProfile> = {}): TrnExternalProfile {
  return {
    playerId: "123",
    profileUrl: "https://tennisrecruiting.net/player.asp?id=123",
    ...overrides,
  };
}

function player(overrides: Partial<TodayBetaPlayerRow>): TodayBetaPlayerRow {
  return {
    displayName: "Test Player",
    trnPlayerId: "123",
    trnProfileUrl: "https://tennisrecruiting.net/player.asp?id=123",
    baselineEstablished: true,
    matchesStored: 0,
    newResultsCount: 0,
    monitoringStatus: "NEEDS_CHECK",
    status: "Ready",
    upcomingTournaments: [],
    ...overrides,
  };
}

describe("resultsCheckWorkflow", () => {
  it("1. recruit never checked → Needs Check", () => {
    assert.equal(
      deriveMonitoringStatus({ lastCheckedAt: undefined, now: NOW }),
      "NEEDS_CHECK",
    );
  });

  it("2. checked today with no import → Checked Today", () => {
    assert.equal(
      deriveMonitoringStatus({
        lastCheckedAt: TODAY_CHECK,
        lastCheckSavedNewCount: 0,
        now: NOW,
      }),
      "CHECKED_TODAY",
    );
  });

  it("3. checked yesterday → Needs Check", () => {
    assert.equal(
      deriveMonitoringStatus({
        lastCheckedAt: YESTERDAY_CHECK,
        lastCheckSavedNewCount: 0,
        now: NOW,
      }),
      "NEEDS_CHECK",
    );
  });

  it("4. Checked — No New Results updates lastCheckedAt only", () => {
    const before = trn({
      lastImportedAt: "2026-08-20T12:00:00.000Z",
      lastCheckSavedNewCount: 2,
    });
    const after = applyCheckedNoNewToTrnProfile(before, TODAY_CHECK);

    assert.equal(after.lastCheckedAt, TODAY_CHECK);
    assert.equal(after.lastImportedAt, before.lastImportedAt);
    assert.equal(after.lastCheckSavedNewCount, 0);
  });

  it("5. Checked — No New Results does not create match records (profile-only update)", () => {
    const after = applyCheckedNoNewToTrnProfile(trn(), TODAY_CHECK);
    assert.equal(after.lastCheckedAt, TODAY_CHECK);
    assert.equal(after.lastImportedAt, undefined);
  });

  it("6. Checked — No New Results does not create interactions (no side effects beyond profile)", () => {
    const after = applyCheckedNoNewToTrnProfile(trn({ baselineEstablishedAt: "2026-08-01T00:00:00.000Z" }), TODAY_CHECK);
    assert.equal(after.baselineEstablishedAt, "2026-08-01T00:00:00.000Z");
    assert.equal(after.playerId, "123");
  });

  it("7. successful import updates lastCheckedAt", () => {
    const after = applyImportCheckToTrnProfile(trn(), TODAY_CHECK, 0);
    assert.equal(after.lastCheckedAt, TODAY_CHECK);
    assert.equal(after.lastImportedAt, TODAY_CHECK);
  });

  it("8. import with a NEW match updates lastCheckedAt and records NEW count", () => {
    const after = applyImportCheckToTrnProfile(trn(), TODAY_CHECK, 1);
    assert.equal(after.lastCheckedAt, TODAY_CHECK);
    assert.equal(after.lastImportedAt, TODAY_CHECK);
    assert.equal(after.lastCheckSavedNewCount, 1);
    assert.equal(
      deriveMonitoringStatus({
        lastCheckedAt: after.lastCheckedAt,
        lastCheckSavedNewCount: after.lastCheckSavedNewCount,
        now: NOW,
      }),
      "NEW_RESULTS_FOUND",
    );
  });

  it("9. duplicate-only import still updates lastCheckedAt", () => {
    const after = applyImportCheckToTrnProfile(
      trn({ lastImportedAt: "2026-08-20T12:00:00.000Z" }),
      TODAY_CHECK,
      0,
    );
    assert.equal(after.lastCheckedAt, TODAY_CHECK);
    assert.equal(after.lastImportedAt, TODAY_CHECK);
    assert.equal(after.lastCheckSavedNewCount, 0);
    assert.equal(
      deriveMonitoringStatus({
        lastCheckedAt: after.lastCheckedAt,
        lastCheckSavedNewCount: after.lastCheckSavedNewCount,
        now: NOW,
      }),
      "CHECKED_TODAY",
    );
  });

  it("10. Activity Summary correctly shows 3/5 checked today", () => {
    const players = [
      player({ displayName: "A", lastCheckedAt: TODAY_CHECK }),
      player({ displayName: "B", lastCheckedAt: TODAY_CHECK }),
      player({ displayName: "C", lastCheckedAt: TODAY_CHECK }),
      player({ displayName: "D", lastCheckedAt: YESTERDAY_CHECK }),
      player({ displayName: "E" }),
    ];

    const summary = buildActivitySummary({
      players,
      newResultsCount: 0,
      recruitsWithActivityLast14Days: 2,
      now: NOW,
    });

    assert.equal(summary.recruitsMonitored, 5);
    assert.equal(summary.checkedTodayCount, 3);
    assert.equal(summary.newResultsCount, 0);
  });

  it("11. Activity Summary correctly shows 5/5 checked today", () => {
    const players = Array.from({ length: 5 }, (_, index) =>
      player({
        displayName: `Player ${index + 1}`,
        lastCheckedAt: TODAY_CHECK,
        matchesStored: index + 1,
      }),
    );

    const summary = buildActivitySummary({
      players,
      newResultsCount: 0,
      recruitsWithActivityLast14Days: 0,
      now: NOW,
    });

    assert.equal(summary.checkedTodayCount, 5);
    assert.equal(summary.recruitsMonitored, 5);
    assert.equal(summary.matchesStored, 15);
    assert.equal(summary.lastMonitoringActivityAt, TODAY_CHECK);
  });

  it("12. Needs Check recruits sort above already-checked recruits", () => {
    const sorted = sortPlayersForMonitoringQueue([
      player({
        displayName: "Checked",
        monitoringStatus: "CHECKED_TODAY",
        lastCheckedAt: TODAY_CHECK,
      }),
      player({
        displayName: "Needs",
        monitoringStatus: "NEEDS_CHECK",
      }),
      player({
        displayName: "New Results",
        monitoringStatus: "NEW_RESULTS_FOUND",
        lastCheckedAt: TODAY_CHECK,
      }),
    ]);

    assert.deepEqual(
      sorted.map((row) => row.displayName),
      ["Needs", "New Results", "Checked"],
    );

    assert.ok(
      comparePlayersForMonitoringQueue(
        player({ displayName: "Needs", monitoringStatus: "NEEDS_CHECK" }),
        player({ displayName: "Checked", monitoringStatus: "CHECKED_TODAY" }),
      ) < 0,
    );
  });

  it("8. formats UTR agent last batch label", () => {
    assert.equal(
      formatUtrAgentLastBatchLabel({
        runId: "run-1",
        startedAt: "2026-09-01T10:00:00.000Z",
        finishedAt: "2026-09-01T10:03:48.000Z",
        durationMs: 228_000,
        cohortSize: 17,
        configured: 17,
        recruitsChecked: 17,
        notConfigured: 0,
        authRequired: 0,
        failed: 0,
        matchesAcquired: 900,
        matchesProcessed: 400,
        matchedExisting: 120,
        baselineInserted: 80,
        newInserted: 2,
        needsReview: 1,
        duplicatesIgnored: 3,
        averageSecondsPerRecruit: 13,
      }),
      "17 checked · 3m 48s · 2 new · 0 failed",
    );
  });
});
