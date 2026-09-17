import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DEFAULT_SCHEDULE_EVENT_WORKSPACE,
  isScheduleEventWorkspaceId,
  parseScheduleEventWorkspaceId,
  SCHEDULE_EVENT_WORKSPACE_IDS,
} from "./workspaces";
import { DEFAULT_PACKING_STARTERS } from "./defaultPackingList";
import { teamOperationsScheduleEventPath } from "@/lib/module-routes";

const root = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("schedule event workspace ids cover the eight Adaptive Workspace sections", () => {
  assert.deepEqual([...SCHEDULE_EVENT_WORKSPACE_IDS], [
    "event-details",
    "traveling-party",
    "teams-involved",
    "travel",
    "practice-match-times",
    "alumni-attending",
    "packing-list",
    "planning",
  ]);
  assert.equal(DEFAULT_SCHEDULE_EVENT_WORKSPACE, "event-details");
  assert.equal(isScheduleEventWorkspaceId("travel"), true);
  assert.equal(isScheduleEventWorkspaceId("overview"), false);
  assert.equal(parseScheduleEventWorkspaceId("packing-list"), "packing-list");
  assert.equal(parseScheduleEventWorkspaceId("nope"), "event-details");
});

test("event workspace URL follows players/tournaments path pattern", () => {
  assert.equal(
    teamOperationsScheduleEventPath("abc-123"),
    "/team-operations/schedule/abc-123",
  );
});

test("schedule table opens event workspace without replacing inline edit stopPropagation", () => {
  const table = read("components/ScheduleTable.tsx");
  assert.match(table, /teamOperationsScheduleEventPath/);
  assert.match(table, /openWorkspace/);
  assert.match(table, /stopRowNavigation/);
  assert.match(table, /onEdit\(event\)/);
  assert.match(table, /Open/);
});

test("schedule event workspace reuses PersonWorkspaceShell and AdaptiveWorkspace", () => {
  const workspace = read("components/ScheduleEventWorkspace.tsx");
  assert.match(workspace, /PersonWorkspaceShell/);
  assert.match(workspace, /PersonWorkspaceDesktopSplit/);
  assert.match(workspace, /MobileWorkspaceSelector/);
  assert.match(workspace, /AdaptiveWorkspace/);
  assert.match(workspace, /Back to Schedule/);
  assert.match(workspace, /id: "event-details"/);
  assert.match(workspace, /id: "traveling-party"/);
  assert.match(workspace, /id: "planning"/);
  assert.doesNotMatch(workspace, /Edit Event/);
});

test("event details fields edit the schedule record via saveScheduleEventAction", () => {
  const session = read("components/ScheduleEventFieldSession.tsx");
  assert.match(session, /saveScheduleEventAction/);
  assert.match(session, /InlineEditCell/);
  assert.match(session, /timeText/);
  assert.match(session, /notes/);
});

test("packing starters are unique and optional", () => {
  const names = new Set(DEFAULT_PACKING_STARTERS);
  assert.equal(names.size, DEFAULT_PACKING_STARTERS.length);
  assert.ok(DEFAULT_PACKING_STARTERS.length >= 5);
});

test("planning migration is additive and event-scoped", () => {
  const migration = readFileSync(
    join(root, "../../..", "supabase/migrations/0060_schedule_event_planning.sql"),
    "utf8",
  );
  assert.match(migration, /team_schedule_event_party/);
  assert.match(migration, /unique \(event_id, person_id\)/);
  assert.match(migration, /team_schedule_event_planning/);
  assert.match(migration, /team_schedule_events \(id\) on delete cascade/);
  assert.doesNotMatch(migration, /insert into public\.team_schedule_event/);
});
