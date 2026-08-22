import assert from "node:assert/strict";
import test from "node:test";

import {
  playersCoachesPersonPath,
  recruitingPersonPath,
  resolvePersonWorkspacePath,
} from "./module-routes";

test("resolvePersonWorkspacePath sends recruits to Recruiting workspace", () => {
  assert.equal(
    resolvePersonWorkspacePath("abc", { roleKey: "recruit" }),
    recruitingPersonPath("abc"),
  );
  assert.equal(
    resolvePersonWorkspacePath("abc", { objectType: "recruits" }),
    recruitingPersonPath("abc"),
  );
});

test("resolvePersonWorkspacePath keeps Team workspace for players and coaches", () => {
  assert.equal(
    resolvePersonWorkspacePath("abc", { roleKey: "player" }),
    playersCoachesPersonPath("abc"),
  );
  assert.equal(
    resolvePersonWorkspacePath("abc", { objectType: "coaches" }),
    playersCoachesPersonPath("abc"),
  );
  assert.equal(
    resolvePersonWorkspacePath("abc", { objectType: "people" }),
    playersCoachesPersonPath("abc"),
  );
  assert.equal(resolvePersonWorkspacePath("abc"), playersCoachesPersonPath("abc"));
});
