import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  easternDay,
  utrWorkerLeaseUntil,
  utrWorkerRetryAt,
} from "./backgroundSchedule.js";

describe("UTR background schedule", () => {
  it("uses the Eastern calendar day across UTC midnight", () => {
    assert.equal(easternDay(new Date("2026-09-24T03:30:00.000Z")), "2026-09-23");
    assert.equal(easternDay(new Date("2026-09-24T12:00:00.000Z")), "2026-09-24");
  });

  it("extends a lease by ten minutes", () => {
    assert.equal(
      utrWorkerLeaseUntil(Date.parse("2026-09-24T12:00:00.000Z")),
      "2026-09-24T12:10:00.000Z",
    );
  });

  it("retries a failed daily check in one hour", () => {
    assert.equal(
      utrWorkerRetryAt(Date.parse("2026-09-24T12:00:00.000Z")),
      "2026-09-24T13:00:00.000Z",
    );
  });
});
