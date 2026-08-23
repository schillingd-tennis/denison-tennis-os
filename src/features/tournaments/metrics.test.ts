import assert from "node:assert/strict";
import test from "node:test";

import { computeTournamentKpis, isUpcomingWithinDays } from "./metrics";
import { EMPTY_TOURNAMENT_TRAVEL_FIELDS, type Tournament } from "./types";

function tournament(partial: Partial<Tournament>): Tournament {
  return {
    id: partial.id ?? "t1",
    name: partial.name ?? "Event",
    startDate: partial.startDate ?? null,
    endDate: partial.endDate ?? null,
    location: null,
    venue: null,
    surface: null,
    status: partial.status ?? "planned",
    recruitingPlan: partial.recruitingPlan ?? "watching",
    websiteUrl: null,
    notes: null,
    sourceKey: null,
    attended: null,
    level: null,
    entryType: null,
    lifecycleStatus: null,
    distanceFromColumbus: null,
    additionalNotes: null,
    recruitsAttendingText: null,
    ...EMPTY_TOURNAMENT_TRAVEL_FIELDS,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    linkedRecruits: partial.linkedRecruits ?? [],
  };
}

test("Traveling To counts traveling plans only", () => {
  const kpis = computeTournamentKpis([
    tournament({ id: "a", recruitingPlan: "traveling" }),
    tournament({ id: "b", recruitingPlan: "watching" }),
    tournament({ id: "c", recruitingPlan: "considering" }),
  ]);
  assert.equal(kpis.travelingTo, 1);
  assert.equal(kpis.watching, 2);
});

test("Linked Recruits counts unique people across tournaments", () => {
  const recruit = {
    personId: "p1",
    displayName: "Ada Player",
    initials: "AP",
    attendanceStatus: "expected" as const,
  };
  const kpis = computeTournamentKpis([
    tournament({ id: "a", linkedRecruits: [recruit] }),
    tournament({ id: "b", linkedRecruits: [recruit, { ...recruit, personId: "p2", displayName: "Bea" }] }),
  ]);
  assert.equal(kpis.linkedRecruits, 2);
});

test("Upcoming is start dates within the next 90 days", () => {
  const now = new Date(Date.UTC(2026, 7, 23));
  const soon = tournament({ id: "soon", startDate: "2026-09-01" });
  const later = tournament({ id: "later", startDate: "2026-12-01" });
  const past = tournament({ id: "past", startDate: "2026-07-01" });
  assert.equal(isUpcomingWithinDays(soon, 90, now), true);
  assert.equal(isUpcomingWithinDays(later, 90, now), false);
  assert.equal(isUpcomingWithinDays(past, 90, now), false);
});
