import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const chrome = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitWorkspaceChrome.tsx"),
  "utf8",
);
const workspaces = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitingWorkspaces.tsx"),
  "utf8",
);
const personWorkspace = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitingPersonWorkspace.tsx"),
  "utf8",
);
const gridPrimitive = readFileSync(
  path.join(process.cwd(), "src/components/adaptive-workspace/WorkspaceContent.tsx"),
  "utf8",
);
const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const shell = readFileSync(
  path.join(process.cwd(), "src/components/person-workspace-shell/PersonWorkspaceShell.tsx"),
  "utf8",
);
const dashboard = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitingDashboard.tsx"),
  "utf8",
);
const tournamentUi = readFileSync(
  path.join(process.cwd(), "src/features/tournaments/components/TournamentWorkspaceFields.tsx"),
  "utf8",
);
const interactionUi = readFileSync(
  path.join(process.cwd(), "src/features/interactions/components/InteractionList.tsx"),
  "utf8",
);

function profileSource(): string {
  const start = chrome.indexOf("export function RecruitWorkspaceProfile");
  const end = chrome.indexOf("export function RecruitWorkspaceNav");
  assert.ok(start >= 0 && end > start, "LOCKED RECRUIT LAYOUT: RecruitWorkspaceProfile must remain the summary header.");
  return chrome.slice(start, end);
}

function slice(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `LOCKED RECRUIT LAYOUT: expected ${startMarker}.`);
  return source.slice(start, end);
}

const profile = profileSource();
const identity = slice(profile, "data-recruit-summary-identity", "data-recruit-summary-academic");
const academic = slice(profile, "data-recruit-summary-academic", 'aria-label="Recruit snapshot"');
const academicsAw = slice(
  workspaces,
  "export function RecruitingAcademicsWorkspace",
  "export function RecruitingRankingsWorkspace",
);
const personalAw = slice(
  workspaces,
  "export function RecruitingPersonalInfoWorkspace",
  "export function RecruitingAcademicsWorkspace",
);
const gridFn = slice(gridPrimitive, "export function WorkspaceFieldGrid", "export function WorkspaceField(");

test("LOCKED RECRUIT LAYOUT: Academic Interests remains in the canonical summary location", () => {
  assert.match(
    academic,
    /data-recruit-summary-academic-interests/,
    "LOCKED RECRUIT LAYOUT: Academic Interests must remain in the Recruit summary.",
  );
  assert.match(
    academic,
    /field="academicInterests"/,
    "LOCKED RECRUIT LAYOUT: Academic Interests must remain in the Recruit summary.",
  );
  assert.doesNotMatch(
    identity,
    /academicInterests/,
    "LOCKED RECRUIT LAYOUT: Academic Interests must not move into the identity column.",
  );
});

test("LOCKED RECRUIT LAYOUT: Schools of Interest remains in the right-side Recruit summary", () => {
  assert.match(
    academic,
    /data-recruit-summary-schools/,
    "LOCKED RECRUIT LAYOUT: Schools of Interest must remain in the right-side Recruit summary.",
  );
  assert.match(
    academic,
    /field="schoolsOfInterest"/,
    "LOCKED RECRUIT LAYOUT: Schools of Interest must remain in the right-side Recruit summary.",
  );
  assert.ok(
    academic.indexOf("data-recruit-summary-academic-interests") < academic.indexOf("data-recruit-summary-schools"),
    "LOCKED RECRUIT LAYOUT: Schools of Interest must remain below Academic Interests on the right.",
  );
  assert.doesNotMatch(
    identity,
    /schoolsOfInterest/,
    "LOCKED RECRUIT LAYOUT: Schools of Interest must not move into the identity column.",
  );
});

test("LOCKED RECRUIT LAYOUT: summary fields are not moved into an Adaptive Workspace", () => {
  assert.doesNotMatch(
    academicsAw,
    /field="schoolsOfInterest"/,
    "LOCKED RECRUIT LAYOUT: Schools of Interest must not move into an Adaptive Workspace.",
  );
  assert.doesNotMatch(
    academicsAw,
    /field="academicInterests"/,
    "LOCKED RECRUIT LAYOUT: Academic Interests must not move into an Adaptive Workspace.",
  );
  assert.doesNotMatch(
    workspaces,
    /data-recruit-summary-/,
    "LOCKED RECRUIT LAYOUT: Recruit summary geometry must not be redefined inside AWs.",
  );
});

test("LOCKED RECRUIT LAYOUT: desktop Adaptive Workspaces retain the canonical multi-column grid", () => {
  assert.match(
    gridFn,
    /data-aw-field-grid=\{columns\}/,
    "LOCKED RECRUIT LAYOUT: Desktop Adaptive Workspaces must retain the canonical multi-column field grid.",
  );
  assert.match(
    personalAw,
    /WorkspaceFieldGrid columns=\{3\}/,
    "LOCKED RECRUIT LAYOUT: Desktop Adaptive Workspaces must retain the canonical multi-column field grid.",
  );
  assert.match(
    academicsAw,
    /WorkspaceFieldGrid columns=\{4\}/,
    "LOCKED RECRUIT LAYOUT: Desktop Adaptive Workspaces must retain the canonical multi-column field grid.",
  );
  assert.doesNotMatch(
    gridFn,
    /grid-cols-1/,
    "LOCKED RECRUIT LAYOUT: Desktop Adaptive Workspaces must not fall back to one field per row.",
  );
});

test("LOCKED RECRUIT LAYOUT: canonical AW grid supports 3–4-column desktop density", () => {
  assert.match(
    css,
    /\[data-aw-field-grid="3"\]\s*\{[^}]*repeat\(3,/,
    "LOCKED RECRUIT LAYOUT: the canonical AW grid must keep 3 desktop columns.",
  );
  assert.match(
    css,
    /\[data-aw-field-grid="4"\]\s*\{[^}]*repeat\(4,/,
    "LOCKED RECRUIT LAYOUT: the canonical AW grid must keep 4 desktop columns.",
  );
  assert.doesNotMatch(
    css,
    /\[data-aw-field-grid="3"\]\s*\{[^}]*repeat\(1,/,
    "LOCKED RECRUIT LAYOUT: desktop AWs must not become one field per row.",
  );
});

test("LOCKED RECRUIT LAYOUT: long-form fields can span without changing the base grid", () => {
  const fieldFn = slice(gridPrimitive, "export function WorkspaceField(", "export function WorkspaceReadOnlyValue");
  assert.match(
    fieldFn,
    /data-aw-field-span=\{span \? "full" : undefined\}/,
    "LOCKED RECRUIT LAYOUT: long-form fields must span via span, not by redefining the grid.",
  );
  assert.match(
    css,
    /\[data-aw-field-span="full"\]\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/,
    "LOCKED RECRUIT LAYOUT: full-width fields must use the canonical span rule.",
  );
});

test("LOCKED RECRUIT LAYOUT: Recruit workspace left/right proportions remain the current values", () => {
  assert.match(
    css,
    /\[data-recruit-summary-split\]\s*\{[^}]*grid-template-columns:\s*max-content minmax\(0,\s*1fr\)/,
    "LOCKED RECRUIT LAYOUT: summary identity | academic proportions must not change.",
  );
  assert.match(
    personWorkspace,
    /PersonWorkspaceDesktopSplit/,
    "LOCKED RECRUIT LAYOUT: Recruit AW must keep the desktop nav/content split.",
  );
  assert.match(
    shell,
    /minmax\(260px,\s*320px\)\s+minmax\(0,\s*1fr\)/,
    "LOCKED RECRUIT LAYOUT: Recruit workspace left/right proportions must remain 260–320px nav + fluid content.",
  );
});

test("LOCKED RECRUIT LAYOUT: mobile responsive behavior remains supported", () => {
  assert.match(
    css,
    /@media \(max-width:\s*767px\)\s*\{[^}]*\[data-recruit-summary-split\]\s*\{[^}]*minmax\(0,\s*1fr\)/,
    "LOCKED RECRUIT LAYOUT: summary must still stack on mobile.",
  );
  assert.match(
    css,
    /@media \(max-width:\s*767px\)\s*\{[^}]*\[data-aw-field-grid\]\s*\{[^}]*minmax\(0,\s*1fr\)/,
    "LOCKED RECRUIT LAYOUT: AW fields must still stack on mobile.",
  );
});

test("LOCKED RECRUIT LAYOUT: dashboard/tournament/interaction UI cannot redefine these primitives", () => {
  assert.doesNotMatch(
    dashboard,
    /data-recruit-summary-/,
    "LOCKED RECRUIT LAYOUT: Dashboard must not redefine Recruit summary geometry.",
  );
  assert.doesNotMatch(
    dashboard,
    /data-aw-field-grid/,
    "LOCKED RECRUIT LAYOUT: Dashboard must not redefine the AW field grid.",
  );
  assert.doesNotMatch(
    tournamentUi,
    /data-recruit-summary-/,
    "LOCKED RECRUIT LAYOUT: Tournament UI must not redefine Recruit summary geometry.",
  );
  assert.doesNotMatch(
    interactionUi,
    /data-recruit-summary-/,
    "LOCKED RECRUIT LAYOUT: Interactions UI must not redefine Recruit summary geometry.",
  );
  assert.doesNotMatch(
    interactionUi,
    /data-aw-field-grid/,
    "LOCKED RECRUIT LAYOUT: Interactions UI must not redefine the AW field grid.",
  );
});
