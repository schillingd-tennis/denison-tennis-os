import assert from "node:assert/strict";
import test from "node:test";

import { DESKTOP_DIRECTORY_CONTROLS_CLASS } from "./DesktopDirectoryControls";

test("desktop directory controls are visible by default (flex), hidden only below md", () => {
  const tokens = DESKTOP_DIRECTORY_CONTROLS_CLASS.split(/\s+/);
  assert.ok(tokens.includes("flex"));
  assert.ok(tokens.includes("max-md:hidden"));
  assert.equal(tokens.includes("hidden"), false, "do not use base `hidden` (md:flex can fail to generate)");
  assert.equal(
    tokens.some((token) => token.startsWith("md:flex")),
    false,
    "do not depend on md:flex to un-hide desktop filters",
  );
});
