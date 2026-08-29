import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = readFileSync(
  join(here, "components/RecruitingDashboard.tsx"),
  "utf8",
);
const directory = readFileSync(
  join(here, "components/RecruitingDirectory.tsx"),
  "utf8",
);
const shared = readFileSync(join(here, "useAddRecruitDrawer.tsx"), "utf8");

test("Recruiting Dashboard renders exactly one + ADD RECRUIT button", () => {
  const matches = dashboard.match(/\+ ADD RECRUIT/g) ?? [];
  assert.equal(matches.length, 1);
  assert.match(dashboard, /ModulePageShell/);
  assert.doesNotMatch(dashboard, /data-recruiting-dashboard-header/);
  assert.doesNotMatch(dashboard, /\+ ADD PLAYER/);
});

test("Dashboard add action opens the canonical shared add-recruit drawer", () => {
  assert.match(dashboard, /useAddRecruitDrawer/);
  assert.match(dashboard, /openAddRecruitDrawer/);
  assert.match(dashboard, /ADD_RECRUIT_BUTTON_CLASS/);
  assert.doesNotMatch(dashboard, /<AddPersonFlow/);
  assert.doesNotMatch(dashboard, /createRecruitAction/);
});

test("Recruit List and Dashboard share one add-recruit implementation", () => {
  assert.match(directory, /useAddRecruitDrawer/);
  assert.match(directory, /ADD_RECRUIT_BUTTON_CLASS/);
  assert.doesNotMatch(directory, /<AddPersonFlow/);
  assert.match(shared, /id: "recruiting-add-recruit"/);
  assert.match(shared, /<AddPersonFlow/);
  assert.match(shared, /createRecruitAction|roleKey=\{ROLE_KEYS\.recruit\}/);
  assert.match(shared, /router\.refresh\(\)/);
});

test("shared add-recruit button keeps Recruit List styling contract", () => {
  assert.match(shared, /bg-denison-red/);
  assert.match(shared, /rounded-control/);
  assert.match(shared, /h-11/);
  assert.match(shared, /shadow-\[0_8px_18px_rgba\(200,16,46,0\.28\)\]/);
  assert.match(shared, /hover:opacity-90/);
});
