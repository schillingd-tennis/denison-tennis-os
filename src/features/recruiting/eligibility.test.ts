import assert from "node:assert/strict";
import { test } from "node:test";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";
import type { RecruitInteraction } from "@/features/interactions/types";

import {
  filterVisibleRecruitingInteractions,
  isEligibleForRecruiting,
  isCurrentRecruitingPerson,
} from "./eligibility";
import { isCurrentDenisonTeamMember } from "@/features/people/utils";
import type { RecruitProfile } from "./types";

function person(
  id: string,
  roleKey: string,
  statusKey: string,
  names: { first: string; last: string } = { first: "Test", last: "Person" },
): Person {
  return {
    id,
    firstName: names.first,
    lastName: names.last,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    relationships: [],
    roleId: `role-${roleKey}`,
    statusId: `status-${statusKey}`,
    role: { id: `role-${roleKey}`, key: roleKey, label: roleKey === ROLE_KEYS.player ? "Player" : "Recruit" },
    status: { id: `status-${statusKey}`, key: statusKey, label: statusKey === STATUS_KEYS.current ? "Current" : "Former" },
  };
}

function profile(personId: string): RecruitProfile {
  return {
    id: `profile-${personId}`,
    personId,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function interaction(id: string, recruitPersonId: string): RecruitInteraction {
  return {
    id,
    recruitPersonId,
    recruitName: "Hidden",
    tournamentId: null,
    tournamentName: null,
    occurredAt: "2026-08-01T00:00:00.000Z",
    interactionType: "text",
    channel: "iMessage",
    direction: "inbound",
    participants: null,
    notes: "hello",
    nextSteps: null,
    loggedBy: null,
    sourceSystem: "apple_messages",
    sourceKey: `g-${id}`,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

test("current recruit is eligible; current Denison player is not", () => {
  const recruit = person("recruit-1", ROLE_KEYS.recruit, STATUS_KEYS.current, { first: "Alex", last: "Recruit" });
  const player = person("player-1", ROLE_KEYS.player, STATUS_KEYS.current, { first: "Luke", last: "Colson" });
  assert.equal(isCurrentRecruitingPerson(recruit), true);
  assert.equal(isEligibleForRecruiting(recruit, profile("recruit-1")), true);
  assert.equal(isCurrentDenisonTeamMember(player), true);
  assert.equal(isEligibleForRecruiting(player, profile("player-1")), false);
});

test("former recruit who is now a current player is excluded even with a recruit profile", () => {
  const luke = person("luke", ROLE_KEYS.player, STATUS_KEYS.current, { first: "Luke", last: "Colson" });
  assert.equal(isEligibleForRecruiting(luke, profile("luke")), false);
  assert.equal(isCurrentDenisonTeamMember(luke), true);
});

test("exclusion uses role/status keys, not display labels", () => {
  const labeled = person("p1", ROLE_KEYS.player, STATUS_KEYS.current);
  labeled.role = { id: "role-player", key: ROLE_KEYS.player, label: "Rostered Student-Athlete" };
  labeled.status = { id: "status-current", key: STATUS_KEYS.current, label: "Active Roster" };
  assert.equal(isCurrentDenisonTeamMember(labeled), true);
  assert.equal(isEligibleForRecruiting(labeled, profile("p1")), false);
});

test("ambiguous identity is not guessed as a team member", () => {
  const unknown = person("x", ROLE_KEYS.recruit, STATUS_KEYS.current);
  unknown.role = { id: "role-x", key: "", label: "Recruit" };
  unknown.status = { id: "status-x", key: "", label: "Current" };
  assert.equal(isCurrentDenisonTeamMember(unknown), false);
});

test("central interaction lists hide current-team rows without deleting them", () => {
  const recruit = person("recruit-1", ROLE_KEYS.recruit, STATUS_KEYS.current, { first: "Alex", last: "Recruit" });
  const luke = person("luke", ROLE_KEYS.player, STATUS_KEYS.current, { first: "Luke", last: "Colson" });
  const other = person("other", ROLE_KEYS.recruit, STATUS_KEYS.current, { first: "Luke", last: "Carter" });
  const rows = [interaction("i1", "recruit-1"), interaction("i2", "luke"), interaction("i3", "other")];
  const people = new Map([
    [recruit.id, recruit],
    [luke.id, luke],
    [other.id, other],
  ]);
  const visible = filterVisibleRecruitingInteractions(rows, people);
  assert.deepEqual(
    visible.map((row) => row.recruitPersonId),
    ["recruit-1", "other"],
  );
  assert.equal(rows.length, 3);
});
