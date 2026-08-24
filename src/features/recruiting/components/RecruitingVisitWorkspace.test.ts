import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const personWorkspace = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitingPersonWorkspace.tsx"),
  "utf8",
);
const workspaces = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitingWorkspaces.tsx"),
  "utf8",
);
const chrome = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitWorkspaceChrome.tsx"),
  "utf8",
);
const summarySlots = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitSummaryLockedSlots.tsx"),
  "utf8",
);

function idsInOrder(source: string, startMarker: string): string[] {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `expected ${startMarker}`);
  const slice = source.slice(start, start + 3500);
  return [...slice.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
}

test("Visit appears between Analytics and Notes in desktop and mobile workspace config", () => {
  const navIds = idsInOrder(personWorkspace, "const workspaceItems").slice(0, 7);
  const adaptiveIds = idsInOrder(personWorkspace, "const adaptiveWorkspaces").slice(0, 7);
  assert.deepEqual(navIds, [
    "personal-info",
    "academics",
    "rankings",
    "analytics",
    "visit",
    "notes",
    "communications",
  ]);
  assert.deepEqual(adaptiveIds, navIds);
  assert.match(personWorkspace, /MobileWorkspaceSelector/);
  assert.match(personWorkspace, /items=\{workspaceItems\.map/);
});

test("Visit uses the canonical AW grid and existing AWs keep their column counts", () => {
  const visit = workspaces.slice(
    workspaces.indexOf("export function RecruitingVisitWorkspace"),
    workspaces.indexOf("export function RecruitingNotesWorkspace"),
  );
  assert.match(visit, /WorkspaceFieldGrid columns=\{3\}/);
  assert.match(visit, /field="visitStartDate"/);
  assert.match(visit, /field="visitEndDate"/);
  assert.match(visit, /field="travelType"/);
  assert.match(visit, /field="flightInfo"/);
  assert.match(visit, /VisitDayCountField/);
  assert.doesNotMatch(
    visit.slice(visit.indexOf("Number of Days")),
    /type="date"/,
  );

  const personal = workspaces.slice(
    workspaces.indexOf("export function RecruitingPersonalInfoWorkspace"),
    workspaces.indexOf("export function RecruitingAcademicsWorkspace"),
  );
  const academics = workspaces.slice(
    workspaces.indexOf("export function RecruitingAcademicsWorkspace"),
    workspaces.indexOf("export function RecruitingRankingsWorkspace"),
  );
  assert.match(personal, /WorkspaceFieldGrid columns=\{3\}/);
  assert.match(academics, /WorkspaceFieldGrid columns=\{4\}/);
  assert.match(academics, /WorkspaceFieldGrid columns=\{3\}/);
});

test("Visit AW can open from a dashboard query without changing summary slots", () => {
  assert.match(personWorkspace, /initialWorkspaceId \?\? "personal-info"/);
  assert.match(chrome, /RecruitSummaryAcademicColumn/);
});

test("Visit chrome tone exists without changing Academic Interests or Schools of Interest chrome", () => {
  assert.match(chrome, /\| "visit"/);
  assert.match(chrome, /RecruitSummaryAcademicColumn/);
  assert.match(summarySlots, /data-recruit-summary-academic-interests/);
  assert.match(summarySlots, /data-recruit-summary-schools/);
});
