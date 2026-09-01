/**
 * Upcoming tournament scoring tests (Today Beta v0.1).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RECRUIT_PRIORITY_KEYS } from "../lookupSeed";
import { buildContactOpportunities } from "./contactOpportunityScore";
import { scoreCadenceOpportunity } from "./contactCadenceScore";
import { mergeContactOpportunities } from "./mergeContactOpportunities";
import { buildContactSuggestedText } from "./suggestedText";
import {
  filterActionableTournaments,
  isTournamentOpportunityActioned,
} from "./contactOpportunityActions";
import { UPCOMING_TOURNAMENT_CONTACT_TODAY_MIN_SCORE } from "./upcomingTournamentConfig";
import {
  daysUntilTournamentStart,
  isTournamentExpired,
  scoreTournamentOpportunity,
  selectNearestTournamentOpportunity,
} from "./upcomingTournamentScore";
import type { RecruitUpcomingTournament } from "./types";

const PRIORITY_A = { key: RECRUIT_PRIORITY_KEYS.elite, label: "1 - Elite" };
const PRIORITY_B = { key: RECRUIT_PRIORITY_KEYS.significant, label: "2 - Significant" };
const NOW = new Date("2026-08-31T12:00:00.000Z");

function tournament(overrides: Partial<RecruitUpcomingTournament> = {}): RecruitUpcomingTournament {
  return {
    id: overrides.id ?? "t1",
    recruitPersonId: "p1",
    tournamentName: "USTA L1 Indianapolis",
    startDate: "2026-09-03",
    endDate: null,
    location: "Indianapolis, IN",
    eventType: null,
    source: "MANUAL",
    sourceUrl: null,
    notes: null,
    status: "UPCOMING",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe("upcomingTournamentScore", () => {
  it("tournament 14 days away does not qualify for Contact Today", () => {
    const startDate = "2026-09-14";
    assert.equal(daysUntilTournamentStart(startDate, NOW), 14);
    const scored = scoreTournamentOpportunity({
      tournament: tournament({ startDate }),
      priority: PRIORITY_A,
      now: NOW,
    });
    assert.ok(scored);
    assert.equal(scored.tournamentScore, 30);
    assert.ok(scored.tournamentScore < UPCOMING_TOURNAMENT_CONTACT_TODAY_MIN_SCORE);
  });

  it("tournament 7 days away does not qualify for Contact Today", () => {
    const startDate = "2026-09-07";
    const scored = scoreTournamentOpportunity({
      tournament: tournament({ startDate }),
      now: NOW,
    });
    assert.ok(scored);
    assert.equal(scored.tournamentScore, 40);
    assert.ok(scored.tournamentScore < UPCOMING_TOURNAMENT_CONTACT_TODAY_MIN_SCORE);
  });

  it("tournament 3 days away qualifies", () => {
    const startDate = "2026-09-03";
    const scored = scoreTournamentOpportunity({
      tournament: tournament({ startDate }),
      priority: PRIORITY_A,
      now: NOW,
    });
    assert.ok(scored);
    assert.equal(scored.tournamentScore, 65);
    assert.ok(scored.tournamentScore >= UPCOMING_TOURNAMENT_CONTACT_TODAY_MIN_SCORE);
  });

  it("tournament tomorrow qualifies", () => {
    const startDate = "2026-09-01";
    const scored = scoreTournamentOpportunity({
      tournament: tournament({ startDate }),
      now: NOW,
    });
    assert.ok(scored);
    assert.equal(scored.tournamentScore, 75);
  });

  it("tournament today qualifies", () => {
    const startDate = "2026-08-31";
    const scored = scoreTournamentOpportunity({
      tournament: tournament({ startDate }),
      now: NOW,
    });
    assert.ok(scored);
    assert.equal(scored.tournamentScore, 80);
  });

  it("applies Priority A bonus", () => {
    const scored = scoreTournamentOpportunity({
      tournament: tournament({ startDate: "2026-09-03" }),
      priority: PRIORITY_A,
      now: NOW,
    });
    assert.equal(scored?.tournamentScore, 65);
  });

  it("applies Priority B bonus", () => {
    const scored = scoreTournamentOpportunity({
      tournament: tournament({ startDate: "2026-09-03" }),
      priority: PRIORITY_B,
      now: NOW,
    });
    assert.equal(scored?.tournamentScore, 60);
  });

  it("expired tournaments do not create opportunities", () => {
    const expired = scoreTournamentOpportunity({
      tournament: tournament({ startDate: "2026-08-20", endDate: "2026-08-24" }),
      now: NOW,
    });
    assert.equal(expired, null);
    assert.equal(
      isTournamentExpired(tournament({ startDate: "2026-08-20", endDate: "2026-08-24" }), NOW),
      true,
    );
  });

  it("uses nearest upcoming tournament when multiple exist", () => {
    const nearest = selectNearestTournamentOpportunity({
      tournaments: [
        tournament({ id: "far", startDate: "2026-09-10" }),
        tournament({ id: "near", startDate: "2026-09-02" }),
      ],
      now: NOW,
    });
    assert.equal(nearest?.upcomingTournament.id, "near");
    assert.equal(nearest?.daysUntilStart, 2);
  });
});

describe("upcoming tournament merge and suggested text", () => {
  it("merges tournament opportunity with cadence", () => {
    const tournamentOpportunity = scoreTournamentOpportunity({
      tournament: tournament({ startDate: "2026-09-03" }),
      priority: PRIORITY_A,
      now: NOW,
    });
    const cadenceOpportunity = scoreCadenceOpportunity({
      priority: PRIORITY_A,
      daysSinceLastContact: 11,
    });

    const merged = mergeContactOpportunities({
      recruitPersonId: "p1",
      recruitName: "Alexander Wriedt",
      recruitFirstName: "Alexander",
      recruitPriorityLabel: PRIORITY_A.label,
      daysSinceLastContact: 11,
      resultOpportunity: null,
      cadenceOpportunity,
      tournamentOpportunity,
    });

    assert.ok(merged);
    assert.deepEqual(merged.opportunityTypes, ["CADENCE", "TOURNAMENT"]);
    assert.equal(merged.opportunityScore, 65);
    assert.equal(merged.cadenceScore, 60);
    assert.equal(merged.tournamentScore, 65);
  });

  it("merges tournament opportunity with result", () => {
    const tournamentOpportunity = scoreTournamentOpportunity({
      tournament: tournament({ startDate: "2026-09-01" }),
      priority: PRIORITY_A,
      now: NOW,
    });
    const resultOpportunity = buildContactOpportunities({
      recruitPersonId: "p1",
      recruitName: "Isaac Lewis",
      priority: PRIORITY_A,
      daysSinceLastContact: null,
      matchResults: [
        {
          id: "m1",
          recruitPersonId: "p1",
          source: "trn_manual",
          result: "WIN",
          opponentRanking: "75",
          firstDetectedAt: NOW.toISOString(),
          lastVerifiedAt: NOW.toISOString(),
          detectionStatus: "NEW",
          resultFingerprint: "fp",
          needsReview: false,
          parseWarnings: [],
        },
      ],
      now: NOW,
    });

    const merged = mergeContactOpportunities({
      recruitPersonId: "p1",
      recruitName: "Isaac Lewis",
      recruitFirstName: "Isaac",
      recruitPriorityLabel: PRIORITY_A.label,
      daysSinceLastContact: null,
      resultOpportunity,
      cadenceOpportunity: null,
      tournamentOpportunity,
      newMatchResults: resultOpportunity?.matchResult ? [resultOpportunity.matchResult] : [],
    });

    assert.ok(merged);
    assert.ok(merged.opportunityTypes.includes("RESULT"));
    assert.ok(merged.opportunityTypes.includes("TOURNAMENT"));
  });

  it("prefers result text over tournament text", () => {
    const suggested = buildContactSuggestedText({
      recruitFirstName: "Isaac",
      matchResult: {
        id: "m1",
        recruitPersonId: "p1",
        source: "trn_manual",
        result: "WIN",
        opponentRanking: "75",
        firstDetectedAt: NOW.toISOString(),
        lastVerifiedAt: NOW.toISOString(),
        detectionStatus: "NEW",
        resultFingerprint: "fp",
        needsReview: false,
        parseWarnings: [],
      },
      hasTournament: true,
      daysUntilTournamentStart: 2,
      hasCadence: true,
      daysSinceLastContact: 12,
    });

    assert.equal(suggested.category, "strong_win");
  });

  it("prefers tournament text over cadence text", () => {
    const suggested = buildContactSuggestedText({
      recruitFirstName: "Isaac",
      hasTournament: true,
      daysUntilTournamentStart: 2,
      hasCadence: true,
      daysSinceLastContact: 12,
    });

    assert.equal(suggested.category, "upcoming_tournament_soon");
    assert.match(suggested.text ?? "", /Hope you have a great tournament/);
  });

  it("uses imminent tournament template for today/tomorrow", () => {
    const suggested = buildContactSuggestedText({
      recruitFirstName: "Isaac",
      hasTournament: true,
      daysUntilTournamentStart: 0,
      hasCadence: false,
      daysSinceLastContact: 5,
    });

    assert.equal(suggested.category, "upcoming_tournament_imminent");
    assert.match(suggested.text ?? "", /I'll be following along/);
  });

  it("handled tournament opportunities are filtered from Contact Today scoring", () => {
    const actions = [
      {
        id: "a1",
        recruitPersonId: "p1",
        opportunityType: "TOURNAMENT" as const,
        action: "HANDLED" as const,
        matchResultId: null,
        upcomingTournamentId: "t1",
        interactionId: "int-1",
        snoozeUntil: null,
        actedAt: NOW.toISOString(),
      },
    ];

    assert.equal(isTournamentOpportunityActioned("t1", actions), true);
    assert.deepEqual(
      filterActionableTournaments([tournament({ id: "t1" })], actions).map((row) => row.id),
      [],
    );
  });

  it("dismissed tournament opportunities persist in action filter", () => {
    const actions = [
      {
        id: "a2",
        recruitPersonId: "p1",
        opportunityType: "TOURNAMENT" as const,
        action: "DISMISSED" as const,
        matchResultId: null,
        upcomingTournamentId: "t1",
        interactionId: null,
        snoozeUntil: null,
        actedAt: NOW.toISOString(),
      },
    ];

    assert.equal(filterActionableTournaments([tournament({ id: "t1" })], actions).length, 0);
  });
});
