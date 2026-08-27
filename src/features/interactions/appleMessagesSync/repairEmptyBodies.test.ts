import assert from "node:assert/strict";
import { test } from "node:test";

import { APPLE_MESSAGES_SOURCE_SYSTEM } from "../appleMessages";
import type { AppleScanRow } from "./scan";
import { runHelper } from "./helperMain";
import {
  applyBodyRepair,
  isRepairEligible,
  parseRepairFlags,
  placeholderNotesInventory,
  planBodyRepair,
} from "./repairEmptyBodies";

function localRow(guid: string, partial: Partial<AppleScanRow> = {}): AppleScanRow {
  return {
    rowId: 1,
    guid,
    chatIdentifier: "+19735550101",
    isFromMe: 0,
    date: 0,
    text: "",
    attributedBody: Buffer.from("xxxxNSString\u0001See you Friday", "utf8"),
    associatedMessageType: 0,
    serviceName: "iMessage",
    ...partial,
  };
}

test("repair flags require every production confirmation switch", () => {
  const parsed = parseRepairFlags(["--repair-empty-bodies"]);
  assert.equal(parsed.repair, true);
  assert.equal(parsed.applyProduction, false);
  assert.throws(
    () =>
      applyBodyRepair([], {
        applyProduction: true,
        confirmProduction: false,
        host: "abc.supabase.co",
      }),
    /confirm-production-body-repair/,
  );
  assert.throws(
    () =>
      applyBodyRepair([], {
        applyProduction: true,
        confirmProduction: true,
        host: "127.0.0.1",
      }),
    /hosted production/,
  );
});

test("repair targets only Apple placeholder notes", () => {
  assert.equal(
    isRepairEligible({
      id: "1",
      sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM,
      sourceKey: "g-1",
      notes: "inbound",
    }),
    true,
  );
  assert.equal(
    isRepairEligible({
      id: "2",
      sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM,
      sourceKey: "g-2",
      notes: "Real note",
    }),
    false,
  );
  assert.equal(
    isRepairEligible({
      id: "3",
      sourceSystem: "manual",
      sourceKey: "g-3",
      notes: "inbound",
    }),
    false,
  );
});

test("repair skips current-team placeholder rows", () => {
  const { counts } = planBodyRepair(
    [
      {
        id: "team",
        sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM,
        sourceKey: "g-1",
        notes: "inbound",
        recruitPersonId: "luke",
      },
    ],
    new Map([["g-1", localRow("g-1")]]),
    new Set(["luke"]),
  );
  assert.equal(counts.currentTeamSkipped, 1);
  assert.equal(counts.eligible, 0);
  assert.equal(counts.wouldUpdate, 0);
});

test("GUID-idempotent repair plans decoded notes without using direction", () => {
  const { counts, plans } = planBodyRepair(
    [
      { id: "a", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-1", notes: "inbound" },
      { id: "b", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-1", notes: "outbound" },
      { id: "c", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-missing", notes: "" },
      { id: "d", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-fail", notes: "inbound" },
    ],
    new Map([
      ["g-1", localRow("g-1")],
      ["g-fail", localRow("g-fail", { attributedBody: Buffer.from("nope", "utf8") })],
    ]),
  );
  assert.equal(counts.eligible, 4);
  assert.equal(counts.decoded, 2);
  assert.equal(counts.decodedFromText, 0);
  assert.equal(counts.decodedFromAttributedBody, 2);
  assert.equal(counts.missingLocalGuid, 1);
  assert.equal(counts.stillDecodeFailed, 1);
  assert.equal(counts.wouldUpdate, 2);
  assert.ok(plans.every((plan) => plan.notes !== "inbound" && plan.notes !== "outbound"));
  const applied = applyBodyRepair(plans, {
    applyProduction: true,
    confirmProduction: true,
    host: "abc.supabase.co",
  });
  assert.equal(applied.length, 2);
  assert.equal(applied[0]?.notes, "See you Friday");
});

test("placeholder inventory counts empty and direction notes without reading bodies", () => {
  const inventory = placeholderNotesInventory([
    { id: "a", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-1", notes: null },
    { id: "b", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-2", notes: "  " },
    { id: "c", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-3", notes: "inbound" },
    { id: "d", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-4", notes: "outbound" },
    { id: "e", sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM, sourceKey: "g-5", notes: "See you Friday" },
  ]);
  assert.equal(inventory.appleRows, 5);
  assert.equal(inventory.emptyNotes, 2);
  assert.equal(inventory.inboundNotes, 1);
  assert.equal(inventory.outboundNotes, 1);
});

test("repair helper refuses production apply", async () => {
  await assert.rejects(
    () => runHelper(["--repair-empty-bodies", "--apply-production"]),
    /Dry-run only/,
  );
});
