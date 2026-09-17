import assert from "node:assert/strict";
import test from "node:test";

import {
  isNavChildActive,
  isNavItemActive,
  normalizeNavPathname,
  primaryNavItems,
  type NavChildItem,
} from "./nav-items";
import { getNestedNavState } from "./nestedNavState";

const todayBeta: NavChildItem = { label: "Today Beta", href: "/recruiting/today-beta" };
const dashboard: NavChildItem = { label: "Dashboard", href: "/recruiting", exact: true };
const list: NavChildItem = { label: "Recruits", href: "/recruiting/list" };
const tournaments: NavChildItem = { label: "Tournaments", href: "/recruiting/tournaments" };
const interactions: NavChildItem = { label: "Interactions", href: "/recruiting/interactions" };
const log: NavChildItem = { label: "Log", href: "/recruiting/log" };

const recruiting = primaryNavItems.find((item) => item.label === "Recruiting");
if (!recruiting) throw new Error("expected Recruiting nav item");

test("normalizeNavPathname strips trailing slashes", () => {
  assert.equal(normalizeNavPathname("/recruiting/"), "/recruiting");
  assert.equal(normalizeNavPathname("/recruiting/list/"), "/recruiting/list");
  assert.equal(normalizeNavPathname("/"), "/");
});

test("Recruiting parent stays active on all recruiting routes", () => {
  assert.equal(isNavItemActive("/recruiting", "/recruiting"), true);
  assert.equal(isNavItemActive("/recruiting/list", "/recruiting"), true);
  assert.equal(isNavItemActive("/recruiting/tournaments", "/recruiting"), true);
  assert.equal(isNavItemActive("/recruiting/abc", "/recruiting"), true);
  assert.equal(isNavItemActive("/operations", "/recruiting"), false);
});

test("Dashboard child is exact /recruiting only", () => {
  assert.equal(isNavChildActive("/recruiting", dashboard), true);
  assert.equal(isNavChildActive("/recruiting/", dashboard), true);
  assert.equal(isNavChildActive("/recruiting/list", dashboard), false);
  assert.equal(isNavChildActive("/recruiting/tournaments", dashboard), false);
  assert.equal(isNavChildActive("/recruiting/abc", dashboard), false);
});

test("Recruiting submenu label is Dashboard, still at /recruiting", () => {
  const child = recruiting.children?.find((item) => item.href === "/recruiting");
  assert.equal(child?.label, "Dashboard");
  assert.equal(child?.href, "/recruiting");
  assert.equal(child?.exact, true);
  assert.equal(
    recruiting.children?.some((item) => item.label === "Overview"),
    false,
  );
});

test("Recruits and Tournaments do not steal person workspaces", () => {
  assert.equal(isNavChildActive("/recruiting/list", list), true);
  assert.equal(isNavChildActive("/recruiting/tournaments", tournaments), true);
  assert.equal(isNavChildActive("/recruiting/abc", list), false);
  assert.equal(isNavChildActive("/recruiting/abc", tournaments), false);
});

test("nested state for /recruiting", () => {
  const state = getNestedNavState("/recruiting", recruiting);
  assert.equal(state.parentActive, true);
  assert.equal(state.expanded, true);
  assert.equal(state.activeChildHref, "/recruiting");
});

test("nested state for /recruiting/list", () => {
  const state = getNestedNavState("/recruiting/list", recruiting);
  assert.equal(state.parentActive, true);
  assert.equal(state.expanded, true);
  assert.equal(state.activeChildHref, "/recruiting/list");
});

test("nested state for /recruiting/tournaments", () => {
  const state = getNestedNavState("/recruiting/tournaments", recruiting);
  assert.equal(state.parentActive, true);
  assert.equal(state.expanded, true);
  assert.equal(state.activeChildHref, "/recruiting/tournaments");
});

test("nested state for /recruiting/[id] keeps parent open with no directory child", () => {
  const state = getNestedNavState("/recruiting/person-123", recruiting);
  assert.equal(state.parentActive, true);
  assert.equal(state.expanded, true);
  assert.equal(state.activeChildHref, null);
});

test("nested state collapses when pathname is outside the parent", () => {
  const state = getNestedNavState("/players-coaches", recruiting);
  assert.equal(state.parentActive, false);
  assert.equal(state.expanded, false);
  assert.equal(state.activeChildHref, null);
});

test("/recruiting/interactions activates the Interactions child", () => {
  assert.equal(isNavChildActive("/recruiting/interactions", interactions), true);
  assert.equal(isNavChildActive("/recruiting/tournaments", tournaments), true);
  assert.equal(isNavChildActive("/recruiting/list", list), true);
  const state = getNestedNavState("/recruiting/interactions", recruiting);
  assert.equal(state.parentActive, true);
  assert.equal(state.activeChildHref, "/recruiting/interactions");
});

test("/recruiting/[id] does not activate Interactions", () => {
  assert.equal(isNavChildActive("/recruiting/person-123", interactions), false);
  assert.equal(isNavChildActive("/recruiting/person-123", list), false);
  assert.equal(isNavChildActive("/recruiting/person-123", tournaments), false);
  const state = getNestedNavState("/recruiting/person-123", recruiting);
  assert.equal(state.activeChildHref, null);
});

test("Today Beta is the first Recruiting submenu item", () => {
  const labels = recruiting.children?.map((item) => item.label) ?? [];
  assert.deepEqual(labels[0], "Today Beta");
  assert.equal(isNavChildActive("/recruiting/today-beta", todayBeta), true);
  const state = getNestedNavState("/recruiting/today-beta", recruiting);
  assert.equal(state.activeChildHref, "/recruiting/today-beta");
});

test("/recruiting/log is the last Recruiting submenu item", () => {
  const labels = recruiting.children?.map((item) => item.label) ?? [];
  assert.deepEqual(labels[labels.length - 1], "Log");
  assert.equal(isNavChildActive("/recruiting/log", log), true);
  assert.equal(isNavChildActive("/recruiting/person-123", log), false);
  const state = getNestedNavState("/recruiting/log", recruiting);
  assert.equal(state.activeChildHref, "/recruiting/log");
});

const teamOperations = primaryNavItems.find((item) => item.label === "Team Operations");
if (!teamOperations) throw new Error("expected Team Operations nav item");

test("Practice sits between Schedule and Intra Squad in Team Operations", () => {
  const labels = teamOperations.children?.map((item) => item.label) ?? [];
  assert.deepEqual(labels, ["Schedule", "Practice", "Intra Squad", "Scouting"]);
  assert.equal(isNavChildActive("/team-operations/practice", { label: "Practice", href: "/team-operations/practice" }), true);
  assert.equal(isNavChildActive("/team-operations/intra-squad", { label: "Intra Squad", href: "/team-operations/intra-squad" }), true);
  assert.equal(isNavChildActive("/team-operations/schedule", { label: "Schedule", href: "/team-operations/schedule" }), true);
  assert.equal(isNavChildActive("/team-operations/scouting", { label: "Scouting", href: "/team-operations/scouting" }), true);
  const state = getNestedNavState("/team-operations/intra-squad", teamOperations);
  assert.equal(state.parentActive, true);
  assert.equal(state.activeChildHref, "/team-operations/intra-squad");
});

const rankings = primaryNavItems.find((item) => item.label === "Rankings");
if (!rankings) throw new Error("expected Rankings nav item");

test("Rankings sits between Recruiting and Fundraising", () => {
  const labels = primaryNavItems.map((item) => item.label);
  assert.equal(labels.indexOf("Rankings"), labels.indexOf("Recruiting") + 1);
  assert.equal(labels.indexOf("Fundraising"), labels.indexOf("Rankings") + 1);
});

test("Rankings is a single sidebar link; submodules stay in workspace tabs", () => {
  assert.equal(rankings.children, undefined);
  assert.equal(isNavItemActive("/rankings/current-ita", rankings.href), true);
  assert.equal(isNavItemActive("/rankings/live-ita", rankings.href), true);
  assert.equal(isNavItemActive("/rankings/current-npi", rankings.href), true);
  assert.equal(isNavItemActive("/rankings/live-npi", rankings.href), true);
});

test("top-level modules own the approved sidebar accent colors", () => {
  assert.deepEqual(
    Object.fromEntries(primaryNavItems.map((item) => [item.label, item.accent])),
    {
      Home: "#c8102e",
      Team: "#64748b",
      "Team Operations": "#16a34a",
      Matches: "#0f766e",
      Recruiting: "#c8102e",
      Rankings: "#7c3aed",
      Fundraising: "#166534",
      "Research Lab": "#3f3f46",
      Resources: "#ff3c00",
    },
  );
});

test("Matches sits between Team Operations and Recruiting", () => {
  const labels = primaryNavItems.map((item) => item.label);
  assert.equal(labels.indexOf("Matches"), labels.indexOf("Team Operations") + 1);
  assert.equal(labels.indexOf("Recruiting"), labels.indexOf("Matches") + 1);
});
