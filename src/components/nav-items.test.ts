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

const dashboard: NavChildItem = { label: "Dashboard", href: "/recruiting", exact: true };
const list: NavChildItem = { label: "Recruit List", href: "/recruiting/list" };
const tournaments: NavChildItem = { label: "Tournaments", href: "/recruiting/tournaments" };
const interactions: NavChildItem = { label: "Interactions", href: "/recruiting/interactions" };

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

test("Recruit List and Tournaments do not steal person workspaces", () => {
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
