import assert from "node:assert/strict";
import test from "node:test";

import { partitionTournamentsForCalendar, tournamentCoversDay, tournamentDateRange } from "./calendar";
import { EMPTY_TOURNAMENT_TRAVEL_FIELDS, type Tournament } from "./types";

function tournament(partial: Partial<Tournament>): Tournament {
  return {
    id: partial.id ?? "t",
    name: partial.name ?? "Event",
    startDate: partial.startDate ?? null,
    endDate: partial.endDate ?? null,
    location: null,
    venue: null,
    surface: null,
    status: "planned",
    recruitingPlan: "watching",
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
    linkedRecruits: [],
  };
}

test("multi-day tournaments cover every day in range", () => {
  const range = tournamentDateRange(tournament({ startDate: "2026-08-01", endDate: "2026-08-03" }));
  assert.ok(range);
  assert.equal(tournamentCoversDay(range, new Date(2026, 7, 1)), true);
  assert.equal(tournamentCoversDay(range, new Date(2026, 7, 3)), true);
  assert.equal(tournamentCoversDay(range, new Date(2026, 7, 4)), false);
});

test("invalid dates are treated as undated", () => {
  const { dated, undated } = partitionTournamentsForCalendar([
    tournament({ id: "valid", startDate: "2026-08-01" }),
    tournament({ id: "bad", startDate: "not-a-date" }),
    tournament({ id: "empty" }),
  ]);
  assert.equal(dated.length, 1);
  assert.deepEqual(
    undated.map((row) => row.id),
    ["bad", "empty"],
  );
});
