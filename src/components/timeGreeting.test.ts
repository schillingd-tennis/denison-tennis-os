import assert from "node:assert/strict";
import test from "node:test";

import { timeGreeting } from "./timeGreeting";

test("uses morning, afternoon, and evening boundaries", () => {
  assert.equal(timeGreeting(5), "Good morning");
  assert.equal(timeGreeting(11), "Good morning");
  assert.equal(timeGreeting(12), "Good afternoon");
  assert.equal(timeGreeting(16), "Good afternoon");
  assert.equal(timeGreeting(17), "Good evening");
  assert.equal(timeGreeting(2), "Good evening");
});
