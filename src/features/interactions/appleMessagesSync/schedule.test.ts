import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decideTick,
  catchUpOwed,
  scheduledOwed,
  isInScheduledWindow,
} from "./schedule";

function local(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(year, month, day, hour, minute, 0, 0);
}

const activation = local(2026, 7, 17, 10, 0).toISOString(); // Mon Aug 17 10:00

test("queued manual work is claimed before catch-up or the 11pm window", () => {
  const now = local(2026, 7, 17, 23, 1);
  assert.equal(
    decideTick({
      hasBaseline: true,
      activeStatus: "queued",
      now,
      activationAt: activation,
      lastImportSuccessAt: null,
    }),
    "claim",
  );
});

test("a live running lease stays idle so a second helper cannot start", () => {
  assert.equal(
    decideTick({
      hasBaseline: true,
      activeStatus: "running",
      now: local(2026, 7, 17, 23, 1),
      activationAt: activation,
      lastImportSuccessAt: null,
    }),
    "idle",
  );
});

test("11:00 PM local window enqueues a scheduled run when tonight has not succeeded", () => {
  const now = local(2026, 7, 17, 23, 1);
  assert.equal(isInScheduledWindow(now), true);
  assert.equal(
    scheduledOwed({ now, activationAt: activation, lastImportSuccessAt: null }),
    true,
  );
  assert.equal(
    decideTick({
      hasBaseline: true,
      activeStatus: null,
      now,
      activationAt: activation,
      lastImportSuccessAt: null,
    }),
    "scheduled",
  );
});

test("a missed night after 11:05 enqueues catch-up until a success lands", () => {
  const now = local(2026, 7, 18, 8, 0);
  assert.equal(isInScheduledWindow(now), false);
  assert.equal(
    catchUpOwed({ now, activationAt: activation, lastImportSuccessAt: null }),
    true,
  );
  assert.equal(
    decideTick({
      hasBaseline: true,
      activeStatus: null,
      now,
      activationAt: activation,
      lastImportSuccessAt: null,
    }),
    "catch_up",
  );
});

test("five-minute ticks outside the window stay idle after a successful night", () => {
  const now = local(2026, 7, 18, 10, 0);
  const last = local(2026, 7, 17, 23, 3).toISOString();
  assert.equal(
    decideTick({
      hasBaseline: true,
      activeStatus: null,
      now,
      activationAt: activation,
      lastImportSuccessAt: last,
    }),
    "idle",
  );
});

test("missing baseline is decided before any queue or schedule work", () => {
  assert.equal(
    decideTick({
      hasBaseline: false,
      activeStatus: "queued",
      now: local(2026, 7, 17, 23, 1),
      activationAt: null,
      lastImportSuccessAt: null,
    }),
    "baseline",
  );
});
