import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { emptyTournamentInput } from "./editor";
import { TOURNAMENT_FIELD_INVENTORY } from "./fieldInventory";
import { normalizeTournamentInput } from "./mapping";

const root = dirname(fileURLToPath(import.meta.url));

function readComponent(basename: string): string {
  const dir = join(root, "components");
  const match = readdirSync(dir).find((name) => name.toLowerCase() === basename.toLowerCase());
  assert.ok(match, `missing component ${basename}`);
  return readFileSync(join(dir, match), "utf8");
}

test("tournament workspace has four adaptive areas and no System Info", () => {
  const workspace = readComponent("TournamentWorkspace.tsx");
  const fields = readComponent("TournamentWorkspaceFields.tsx");
  const chrome = readComponent("TournamentWorkspaceChrome.tsx");
  assert.match(workspace, /id: "overview"/);
  assert.match(workspace, /id: "players"/);
  assert.match(workspace, /id: "travel"/);
  assert.match(workspace, /id: "links"/);
  assert.doesNotMatch(workspace, /id: "schedule"/);
  assert.doesNotMatch(workspace, /id: "location"/);
  assert.doesNotMatch(workspace, /id: "recruiting"/);
  assert.doesNotMatch(fields, /System Info|Import key|sourceKey/);
  assert.match(fields, /Dates & Location/);
  assert.doesNotMatch(fields, /Operational status/);
  assert.doesNotMatch(fields, /Recruiting status/);
  assert.doesNotMatch(fields, /aria-label="Recruiting"/);
  assert.doesNotMatch(fields, /field="status"/);
  assert.doesNotMatch(fields, /field="recruitingPlan"/);
  assert.doesNotMatch(fields, /field="venue"/);
  assert.match(fields, /field="attended"/);
  assert.match(chrome, /The Players/);
  assert.match(chrome, /Travel Info/);
  assert.match(chrome, /Links \/ Notes/);
});

test("tournament header opens Tournament Page from websiteUrl in a new tab", () => {
  const chrome = readComponent("TournamentWorkspaceChrome.tsx");
  assert.match(chrome, /Open Tournament Page/);
  assert.match(chrome, /websiteUrl/);
  assert.match(chrome, /target="_blank"/);
  assert.match(chrome, /noopener noreferrer/);
  assert.match(chrome, /disabled/);
});

test("tournament fields stay inline-editable with no page-level edit mode", () => {
  const workspace = readComponent("TournamentWorkspace.tsx");
  const session = readComponent("TournamentFieldSession.tsx");
  assert.doesNotMatch(workspace, /Edit Tournament/);
  assert.match(session, /InlineEditCell/);
  assert.match(session, /estimatedDriveTime/);
  assert.match(session, /hotelName/);
  assert.match(session, /drawsUrl/);
});

test("removing a player unlinks the join row only", () => {
  const players = readComponent("TournamentPlayersWorkspace.tsx");
  const actions = readFileSync(join(root, "actions.ts"), "utf8");
  const repository = readFileSync(join(root, "repository.ts"), "utf8");
  assert.match(players, /unlinkRecruitAction/);
  assert.match(players, /The recruit record will not be deleted/);
  assert.match(actions, /unlinkRecruitFromTournament/);
  assert.match(repository, /LINKS_TABLE/);
  assert.match(repository, /\.delete\(/);
  assert.doesNotMatch(repository, /from\("production_people"\)\.delete/);
});

test("travel date validation rejects a return before departure", () => {
  const result = normalizeTournamentInput({
    ...emptyTournamentInput(),
    name: "Kalamazoo",
    departureDate: "2027-08-09",
    returnDate: "2027-08-01",
  });
  assert.equal("error" in result, true);
});

test("system metadata is not displayed in the tournament workspace inventory", () => {
  const system = TOURNAMENT_FIELD_INVENTORY.filter((field) => field.kind === "system");
  assert.ok(system.length >= 3);
  for (const field of system) {
    assert.equal(field.displayed, false, `${field.db} should stay hidden from coaches`);
  }
});
