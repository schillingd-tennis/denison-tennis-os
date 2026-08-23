import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const chromePath = path.join(
  process.cwd(),
  "src/features/recruiting/components/RecruitWorkspaceChrome.tsx",
);
const workspacePath = path.join(
  process.cwd(),
  "src/features/recruiting/components/RecruitingPersonWorkspace.tsx",
);
const cssPath = path.join(process.cwd(), "src/app/globals.css");

const chrome = readFileSync(chromePath, "utf8");
const workspace = readFileSync(workspacePath, "utf8");
const css = readFileSync(cssPath, "utf8");

function sliceProfile(source: string): string {
  const start = source.indexOf("export function RecruitWorkspaceProfile");
  const end = source.indexOf("export function RecruitWorkspaceNav");
  assert.ok(start >= 0, "expected RecruitWorkspaceProfile");
  assert.ok(end > start, "expected RecruitWorkspaceNav after profile");
  return source.slice(start, end);
}

function sliceAttr(source: string, attr: string, until: string): string {
  const start = source.indexOf(attr);
  const end = source.indexOf(until, start + attr.length);
  assert.ok(start >= 0, `expected ${attr}`);
  assert.ok(end > start, `expected ${until} after ${attr}`);
  return source.slice(start, end);
}

const profile = sliceProfile(chrome);

test("canonical recruit header is RecruitWorkspaceProfile only", () => {
  assert.match(
    workspace,
    /RecruitWorkspaceProfile,\s*$/m,
  );
  assert.match(workspace, /from "\.\/RecruitWorkspaceChrome"/);
  assert.equal(
    workspace.includes("PersonHeader"),
    false,
    "Person Workspace header is not the recruit header",
  );
  assert.equal(workspace.includes("PersonWorkspaceChrome"), false);
  assert.equal(
    (chrome.match(/export function RecruitWorkspaceProfile/g) ?? []).length,
    1,
  );
});

test("desktop header puts academic fields in the right column, not under identity", () => {
  const identity = sliceAttr(
    profile,
    "data-recruit-summary-identity",
    "data-recruit-summary-academic",
  );
  const academic = sliceAttr(
    profile,
    "data-recruit-summary-academic",
    'aria-label="Recruit snapshot"',
  );

  assert.match(identity, /label="Class"/);
  assert.match(identity, /label="Hometown"/);
  assert.doesNotMatch(identity, /Academic interests/);
  assert.doesNotMatch(identity, /Schools of interest/);

  assert.match(academic, /label="Academic interests"/);
  assert.match(academic, /label="Schools of interest"/);
  assert.doesNotMatch(academic, /label="Class"/);
  assert.doesNotMatch(academic, /label="Hometown"/);
});

test("metric cards stay beneath the complete two-column header row", () => {
  const splitIdx = profile.indexOf("data-recruit-summary-split");
  const academicIdx = profile.indexOf("data-recruit-summary-academic");
  const snapshotIdx = profile.indexOf('aria-label="Recruit snapshot"');

  assert.ok(splitIdx < academicIdx);
  assert.ok(academicIdx < snapshotIdx);

  const afterSplitOpen = profile.slice(splitIdx);
  const splitCloseRelative = afterSplitOpen.indexOf(
    'aria-label="Recruit snapshot"',
  );
  const splitBlock = afterSplitOpen.slice(0, splitCloseRelative);
  assert.match(splitBlock, /data-recruit-summary-identity/);
  assert.match(splitBlock, /data-recruit-summary-academic/);
  assert.doesNotMatch(
    profile.slice(snapshotIdx),
    /data-recruit-summary-academic/,
  );
});

test("desktop CSS is two-column by default; md: column utilities are not required", () => {
  assert.match(
    css,
    /\[data-recruit-summary-split\]\s*\{[^}]*grid-template-columns:\s*max-content minmax\(0,\s*1fr\)/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*767px\)\s*\{[^}]*\[data-recruit-summary-split\]\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*767px\)[\s\S]*\[data-recruit-summary-academic\]\s*\{[^}]*border-top:/,
  );

  const splitMarkup = profile.slice(
    profile.indexOf("<div data-recruit-summary-split"),
    profile.indexOf("data-recruit-summary-identity"),
  );
  assert.doesNotMatch(splitMarkup, /grid-cols-1/);
  assert.doesNotMatch(splitMarkup, /flex-col/);
  assert.doesNotMatch(profile, /md:\[grid-template-columns/);
  assert.doesNotMatch(profile, /md:flex-row/);
});

test("Schools of Interest stays in the recruit summary right column, not the AW", () => {
  const workspaces = readFileSync(
    path.join(process.cwd(), "src/features/recruiting/components/RecruitingWorkspaces.tsx"),
    "utf8",
  );
  const academic = sliceAttr(
    profile,
    "data-recruit-summary-academic",
    'aria-label="Recruit snapshot"',
  );

  assert.match(academic, /data-recruit-summary-schools/);
  assert.match(academic, /data-recruit-summary-academic-interests/);
  assert.match(academic, /field="schoolsOfInterest"/);
  assert.match(academic, /field="academicInterests"/);

  const academicsFn = workspaces.slice(
    workspaces.indexOf("export function RecruitingAcademicsWorkspace"),
    workspaces.indexOf("export function RecruitingRankingsWorkspace"),
  );
  assert.doesNotMatch(academicsFn, /field="schoolsOfInterest"/);
  assert.doesNotMatch(academicsFn, /field="academicInterests"/);
  assert.doesNotMatch(academicsFn, /WorkspaceSplit/);
});

test("Recruit Overview and Academics AWs use the shared dense field grid", () => {
  const workspaces = readFileSync(
    path.join(process.cwd(), "src/features/recruiting/components/RecruitingWorkspaces.tsx"),
    "utf8",
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
  assert.doesNotMatch(personal, /space-y-4.*RecruitPersonField/);
});
