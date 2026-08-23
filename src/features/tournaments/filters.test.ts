import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTournamentFilterDefinitions,
  sanitizeTournamentFilterIds,
  TOURNAMENT_FILTER_GROUPS,
} from "./filters";
import { EMPTY_TOURNAMENT_TRAVEL_FIELDS, type Tournament } from "./types";

function tournament(partial: Partial<Tournament>): Tournament {
  return {
    id: partial.id ?? "t",
    name: partial.name ?? "Event",
    startDate: "2026-08-01",
    endDate: "2026-08-02",
    location: "Columbus, OH",
    venue: null,
    surface: "Hard",
    status: "planned",
    recruitingPlan: "watching",
    websiteUrl: null,
    notes: null,
    sourceKey: null,
    attended: null,
    level: "L1",
    entryType: null,
    lifecycleStatus: "upcoming",
    distanceFromColumbus: "0",
    additionalNotes: null,
    recruitsAttendingText: null,
    ...EMPTY_TOURNAMENT_TRAVEL_FIELDS,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    linkedRecruits: [],
  };
}

test("directory filters do not include Surface or Plan", () => {
  const definitions = buildTournamentFilterDefinitions([tournament({})]);
  assert.equal(
    definitions.some((definition) => definition.category === "surface" || definition.id.startsWith("surface:")),
    false,
  );
  assert.equal(
    definitions.some((definition) => definition.category === "plan" || definition.id.startsWith("plan:")),
    false,
  );
  assert.deepEqual(
    TOURNAMENT_FILTER_GROUPS.map((group) => group.category),
    ["status", "date", "level"],
  );
});

test("stale Surface and Plan filter ids are dropped", () => {
  const definitions = buildTournamentFilterDefinitions([tournament({})]);
  const sanitized = sanitizeTournamentFilterIds(
    ["surface:Hard", "plan:watching", "status:upcoming", "all"],
    definitions,
  );
  assert.deepEqual(sanitized, ["status:upcoming"]);
});
