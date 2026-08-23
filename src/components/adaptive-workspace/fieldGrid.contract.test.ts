import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const content = readFileSync(join(root, "src/components/adaptive-workspace/WorkspaceContent.tsx"), "utf8");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const recruitingWorkspaces = readFileSync(
  join(root, "src/features/recruiting/components/RecruitingWorkspaces.tsx"),
  "utf8",
);
const tournamentFields = readFileSync(
  join(root, "src/features/tournaments/components/TournamentWorkspaceFields.tsx"),
  "utf8",
);
const interactionList = readFileSync(
  join(root, "src/features/interactions/components/InteractionList.tsx"),
  "utf8",
);
const chrome = readFileSync(
  join(root, "src/features/recruiting/components/RecruitWorkspaceChrome.tsx"),
  "utf8",
);

test("shared AW field grid is a data-attribute contract, not Tailwind sm:/md: columns", () => {
  const gridFn = content.slice(
    content.indexOf("export function WorkspaceFieldGrid"),
    content.indexOf("export function WorkspaceField("),
  );
  const fieldFn = content.slice(
    content.indexOf("export function WorkspaceField("),
    content.indexOf("export function WorkspaceReadOnlyValue"),
  );
  assert.match(gridFn, /data-aw-field-grid=\{columns\}/);
  assert.match(fieldFn, /data-aw-field-span=\{span \? "full" : undefined\}/);
  assert.doesNotMatch(gridFn, /sm:\[grid-template-columns/);
  assert.doesNotMatch(gridFn, /md:\[grid-template-columns/);
  assert.doesNotMatch(gridFn, /grid-cols-1/);
  assert.doesNotMatch(content, /fieldGridColumns/);
});

test("unlayered CSS defines 2/3/4 desktop columns and collapses on small screens", () => {
  assert.match(css, /\[data-aw-field-grid="3"\]\s*\{[^}]*repeat\(3,/);
  assert.match(css, /\[data-aw-field-grid="4"\]\s*\{[^}]*repeat\(4,/);
  assert.match(css, /\[data-aw-field-grid="2"\]\s*\{[^}]*repeat\(2,/);
  assert.match(
    css,
    /@media \(max-width:\s*767px\)\s*\{[^}]*\[data-aw-field-grid\]\s*\{[^}]*minmax\(0,\s*1fr\)/,
  );
  assert.match(css, /\[data-aw-field-span="full"\]\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
});

test("Recruit Overview AW uses WorkspaceFieldGrid", () => {
  const personal = recruitingWorkspaces.slice(
    recruitingWorkspaces.indexOf("export function RecruitingPersonalInfoWorkspace"),
    recruitingWorkspaces.indexOf("export function RecruitingAcademicsWorkspace"),
  );
  assert.match(personal, /<WorkspaceFieldGrid columns=\{3\}/);
  assert.match(personal, /<WorkspaceFieldGrid columns=\{3\}/);
});

test("Recruit Academics AW uses the shared dense grid and not a vertical interests split", () => {
  const academics = recruitingWorkspaces.slice(
    recruitingWorkspaces.indexOf("export function RecruitingAcademicsWorkspace"),
    recruitingWorkspaces.indexOf("export function RecruitingRankingsWorkspace"),
  );
  assert.match(academics, /WorkspaceFieldGrid columns=\{4\}/);
  assert.match(academics, /WorkspaceFieldGrid columns=\{3\}/);
  assert.doesNotMatch(academics, /WorkspaceSplit/);
  assert.doesNotMatch(academics, /schoolsOfInterest/);
});

test("Tournament Overview continues to use a multi-column field grid", () => {
  assert.match(tournamentFields, /WorkspaceFieldGrid columns=\{3\}/);
  assert.match(tournamentFields, /tournament-field-grid-3/);
});

test("Interaction feature files do not own Recruit summary geometry", () => {
  assert.doesNotMatch(interactionList, /data-recruit-summary-/);
  assert.doesNotMatch(interactionList, /schoolsOfInterest/);
  assert.match(chrome, /data-recruit-summary-split/);
  assert.match(chrome, /data-recruit-summary-academic/);
});
