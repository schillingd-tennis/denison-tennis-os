import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const component = readFileSync(join(here, "MobileHomeDashboard.tsx"), "utf8");
const page = readFileSync(join(here, "../../app/page.tsx"), "utf8");
const desktop = readFileSync(join(here, "HomeDashboard.tsx"), "utf8");

test("root dashboard renders mobile command center by default below md", () => {
  assert.match(desktop, /MobileHomeDashboard/);
  assert.match(desktop, /hidden md:block/);
  assert.match(component, /data-mobile-home-dashboard/);
  assert.match(component, /md:hidden/);
});

test("mobile home exposes core road and courtside workflows", () => {
  for (const label of ["Today’s practice", "Recruits", "Intrasquad entry", "Scouting", "Match results", "Upcoming recruiting trips"]) assert.match(component, new RegExp(label));
});

test("mobile home loads today's plan and only upcoming Plan to Attend tournaments", () => {
  assert.match(page, /listDailyPracticePlans/);
  assert.match(page, /plan\.planDate === today/);
  assert.match(page, /tournament\.recruitingPlan === "traveling"/);
  assert.match(page, /!isPastTournament\(tournament\)/);
});
