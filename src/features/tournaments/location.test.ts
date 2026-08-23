import assert from "node:assert/strict";
import test from "node:test";

import {
  compareDefaultTournamentOrder,
  joinCityState,
  joinDistance,
  parseDistanceMiles,
  partitionTournamentsBySchedule,
  splitCityState,
  splitDistance,
} from "./location";
import { EMPTY_TOURNAMENT_TRAVEL_FIELDS, type Tournament } from "./types";

function tournament(partial: Partial<Tournament>): Tournament {
  return {
    id: partial.id ?? "t",
    name: partial.name ?? "Event",
    startDate: partial.startDate ?? null,
    endDate: partial.endDate ?? null,
    location: partial.location ?? null,
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
    lifecycleStatus: partial.lifecycleStatus ?? null,
    distanceFromColumbus: partial.distanceFromColumbus ?? null,
    additionalNotes: null,
    recruitsAttendingText: null,
    ...EMPTY_TOURNAMENT_TRAVEL_FIELDS,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    linkedRecruits: [],
  };
}

test("splitCityState uses the last comma", () => {
  assert.deepEqual(splitCityState("West Windsor (Princeton), NJ"), {
    city: "West Windsor (Princeton)",
    state: "NJ",
  });
});

test("parseDistanceMiles uses the leading number", () => {
  assert.equal(parseDistanceMiles("207 4:40 hours"), 207);
  assert.equal(parseDistanceMiles("1,052"), 1052);
  assert.equal(parseDistanceMiles(""), null);
});

test("joinCityState and splitDistance round-trip imported values", () => {
  assert.equal(joinCityState("Princeton", "NJ"), "Princeton, NJ");
  assert.deepEqual(splitDistance("207 4:40 hours"), { miles: "207", extra: "4:40 hours" });
  assert.equal(joinDistance("207", "4:40 hours"), "207 4:40 hours");
});

test("default order puts upcoming before past", () => {
  const past = tournament({ id: "p", name: "Past", startDate: "2025-06-24", lifecycleStatus: "past" });
  const upcoming = tournament({ id: "u", name: "Soon", startDate: "2026-09-01", lifecycleStatus: "upcoming" });
  assert.ok(compareDefaultTournamentOrder(upcoming, past) < 0);
});

test("partitionTournamentsBySchedule splits by lifecycle then dates", () => {
  const inProgress = tournament({
    id: "now",
    name: "Live",
    startDate: "2026-08-20",
    endDate: "2026-08-25",
  });
  const future = tournament({ id: "soon", name: "Soon", startDate: "2026-09-01", lifecycleStatus: "upcoming" });
  const finished = tournament({
    id: "old",
    name: "Done",
    startDate: "2026-07-01",
    endDate: "2026-07-03",
    lifecycleStatus: "past",
  });
  const older = tournament({
    id: "older",
    name: "Older",
    startDate: "2026-05-01",
    endDate: "2026-05-04",
  });
  const grouped = partitionTournamentsBySchedule(
    [finished, future, older, inProgress],
    "2026-08-23",
  );
  assert.deepEqual(
    grouped.upcoming.map((row) => row.id),
    ["now", "soon"],
  );
  assert.deepEqual(
    grouped.past.map((row) => row.id),
    ["old", "older"],
  );
});
