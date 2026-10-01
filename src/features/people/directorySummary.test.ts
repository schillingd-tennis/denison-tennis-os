import assert from "node:assert/strict";
import test from "node:test";

import { ROLE_KEYS } from "@/features/lookups/seed";

import { computePeopleDirectoryKpis } from "./directorySummary";
import type { Person } from "./types";

function person(id: string, roleKey: string): Person {
  return {
    id,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    roleId: `role-${roleKey}`,
    statusId: "status-current",
    role: { id: `role-${roleKey}`, key: roleKey, label: roleKey },
    status: { id: "status-current", key: "current", label: "Current" },
    firstName: id,
    lastName: "Test",
    relationships: [],
  };
}

test("directory KPIs describe only the supplied filtered found set", () => {
  const players = [person("p1", ROLE_KEYS.player), person("p2", ROLE_KEYS.player)];
  const coach = person("c1", ROLE_KEYS.coach);

  assert.deepEqual(computePeopleDirectoryKpis(players), {
    total: 2,
    players: 2,
    coaches: 0,
  });
  assert.deepEqual(computePeopleDirectoryKpis([coach]), {
    total: 1,
    players: 0,
    coaches: 1,
  });
});
