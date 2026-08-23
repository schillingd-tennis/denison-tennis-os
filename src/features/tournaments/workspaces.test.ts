import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TOURNAMENT_WORKSPACE,
  isTournamentWorkspaceId,
  parseTournamentWorkspaceId,
  TOURNAMENT_WORKSPACE_IDS,
} from "./workspaces";

test("isTournamentWorkspaceId accepts the four workspace ids", () => {
  assert.deepEqual([...TOURNAMENT_WORKSPACE_IDS], ["overview", "players", "travel", "links"]);
  assert.equal(isTournamentWorkspaceId("overview"), true);
  assert.equal(isTournamentWorkspaceId("players"), true);
  assert.equal(isTournamentWorkspaceId("travel"), true);
  assert.equal(isTournamentWorkspaceId("links"), true);
});

test("isTournamentWorkspaceId rejects invalid ids", () => {
  assert.equal(isTournamentWorkspaceId("links-notes"), false);
  assert.equal(isTournamentWorkspaceId("schedule"), false);
  assert.equal(isTournamentWorkspaceId(""), false);
  assert.equal(isTournamentWorkspaceId(undefined), false);
  assert.equal(isTournamentWorkspaceId(null), false);
});

test("parseTournamentWorkspaceId falls back to overview", () => {
  assert.equal(parseTournamentWorkspaceId("players"), "players");
  assert.equal(parseTournamentWorkspaceId("links-notes"), DEFAULT_TOURNAMENT_WORKSPACE);
  assert.equal(parseTournamentWorkspaceId(undefined), "overview");
});
