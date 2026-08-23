import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildTournamentFilterDefinitions, TOURNAMENT_FILTER_GROUPS } from "./filters";
import { TOURNAMENT_TABLE_COLUMNS } from "./tableColumns";

const root = dirname(fileURLToPath(import.meta.url));

function readComponent(basename: string): string {
  const dir = join(root, "components");
  const match = readdirSync(dir).find((name) => name.toLowerCase() === basename.toLowerCase());
  assert.ok(match, `missing component ${basename}`);
  return readFileSync(join(dir, match), "utf8");
}

function componentNames(): string[] {
  return readdirSync(join(root, "components")).map((name) => name.toLowerCase());
}

/**
 * Recurrence cause (macOS case-insensitive disk):
 * `/recruiting/tournaments` always rendered TournamentsDashboard. That file
 * still mounted TournamentDetailPanel in an xl 22rem split pane with
 * selectedId. Workspace edits live in TournamentWorkspace*.tsx and did not
 * replace the List. TournamentDetailPanel was never unmounted from the
 * dashboard, so the preview returned whenever the dashboard kept/restored
 * that split. There is one List (TournamentList) and one workspace
 * (TournamentWorkspace). TournamentDetailPanel is obsolete and must stay
 * deleted.
 */
test("list page does not render a preview card or selected-row preview state", () => {
  const dashboard = readComponent("TournamentsDashboard.tsx");
  const list = readComponent("TournamentList.tsx");
  assert.equal(componentNames().includes("tournamentdetailpanel.tsx"), false);
  assert.equal(dashboard.includes("TournamentDetailPanel"), false);
  assert.equal(dashboard.includes("selectedId"), false);
  assert.equal(dashboard.includes("xl:grid-cols-[minmax(0,1fr)_22rem]"), false);
  assert.equal(list.includes("selectedId"), false);
  assert.equal(list.includes("onSelect"), false);
});

test("List and Calendar tabs are present", () => {
  const dashboard = readComponent("TournamentsDashboard.tsx");
  assert.match(dashboard, /label:\s*"List"/);
  assert.match(dashboard, /label:\s*"Calendar"/);
});

test("tournament names link to the workspace route helper", () => {
  const list = readComponent("TournamentList.tsx");
  assert.match(list, /recruitingTournamentPath/);
});

test("directory columns do not include Surface or Plan", () => {
  const titles = TOURNAMENT_TABLE_COLUMNS.map((column) => column.title);
  const ids = TOURNAMENT_TABLE_COLUMNS.map((column) => column.id as string);
  assert.equal(titles.includes("Surface"), false);
  assert.equal(titles.includes("Plan"), false);
  assert.equal(ids.includes("surface"), false);
  assert.equal(ids.includes("recruitingPlan"), false);
});

test("Surface filter is absent", () => {
  assert.deepEqual(
    TOURNAMENT_FILTER_GROUPS.map((group) => group.category),
    ["status", "date", "level"],
  );
  const definitions = buildTournamentFilterDefinitions([]);
  assert.equal(
    definitions.some((definition) => definition.category === "surface" || definition.id.startsWith("surface:")),
    false,
  );
});

test("workspace has no Edit Tournament button and uses in-place field editing", () => {
  const workspace = readComponent("TournamentWorkspace.tsx");
  const chrome = readComponent("TournamentWorkspaceChrome.tsx");
  const session = readComponent("TournamentFieldSession.tsx");
  assert.equal(/Edit Tournament/.test(`${workspace}\n${chrome}`), false);
  assert.match(workspace, /TournamentFieldSession/);
  assert.match(session, /InlineEditCell/);
});

test("workspace selector includes Overview, The Players, Travel Info, and Links / Notes", () => {
  const chrome = readComponent("TournamentWorkspaceChrome.tsx");
  assert.match(chrome, /title: "Overview"/);
  assert.match(chrome, /title: "The Players"/);
  assert.match(chrome, /title: "Travel Info"/);
  assert.match(chrome, /title: "Links \/ Notes"/);
});
