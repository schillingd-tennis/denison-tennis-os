import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { APPLE_EPOCH_MS, type RecruitMatchInput } from "../appleMessages";
import { MemoryMessagesCatalog } from "./catalog";
import {
  BaselineRequiredError,
  recordBaseline,
  retryUnresolved,
  scanForward,
} from "./engine";
import { ProcessFileLock, SyncLockHeldError } from "./lock";
import { syncLockPath } from "./paths";
import { isForwardCandidate, type AppleScanRow } from "./scan";
import { openSyncStore } from "./store";

function appleNanos(iso: string): bigint {
  const millis = Date.parse(iso) - APPLE_EPOCH_MS;
  return BigInt(millis) * BigInt(1_000_000);
}

function scanRow(partial: Partial<AppleScanRow> & Pick<AppleScanRow, "rowId" | "guid" | "chatIdentifier" | "date">): AppleScanRow {
  return {
    isFromMe: 0,
    text: "hello",
    attributedBody: null,
    associatedMessageType: 0,
    serviceName: "iMessage",
    ...partial,
  };
}

function withStore(fn: (home: string, store: ReturnType<typeof openSyncStore>) => void): void {
  const home = mkdtempSync(join(tmpdir(), "apple-messages-sync-"));
  const store = openSyncStore(home);
  try {
    fn(home, store);
  } finally {
    store.close();
    rmSync(home, { recursive: true, force: true });
  }
}

const recruit: RecruitMatchInput = {
  id: "recruit-1",
  name: "Alex One",
  osHandles: ["+19735550101"],
};

const context = {
  recruits: [recruit],
  contacts: new Map<string, Set<string>>(),
  overrides: {} as Record<string, string>,
};

test("baseline records max ROWID and activation time and imports zero rows", () => {
  withStore((_home, store) => {
    const catalog = new MemoryMessagesCatalog([
      scanRow({
        rowId: 40,
        guid: "g-40",
        chatIdentifier: "+19735550101",
        date: appleNanos("2024-05-01T00:00:00.000Z"),
      }),
      scanRow({
        rowId: 90,
        guid: "g-90",
        chatIdentifier: "+19735550101",
        date: appleNanos("2024-06-01T00:00:00.000Z"),
      }),
    ]);
    const at = new Date("2024-06-15T12:00:00.000Z");
    const result = recordBaseline(store, catalog, at);
    assert.equal(result.importedCount, 0);
    assert.equal(result.baselineRowId, 90);
    assert.equal(result.activationAt, at.toISOString());
    const state = store.readState();
    assert.equal(state.baselineRowId, 90);
    assert.equal(state.lastScannedRowId, 90);
    assert.equal(state.activationAt, at.toISOString());
    assert.equal(state.lastImportSuccessAt, null);
    store.assertNoBodyColumns();
  });
});

test("scan without a baseline is refused", () => {
  withStore((_home, store) => {
    const catalog = new MemoryMessagesCatalog([]);
    assert.throws(
      () => scanForward(store, catalog, context),
      (error: unknown) => error instanceof BaselineRequiredError,
    );
  });
});

test("ROWID at or below the baseline is never selected", () => {
  const activationAt = "2024-06-01T00:00:00.000Z";
  const older = scanRow({
    rowId: 50,
    guid: "g-50",
    chatIdentifier: "+19735550101",
    date: appleNanos("2024-07-01T00:00:00.000Z"),
    text: "after activation but old rowid",
  });
  const newer = scanRow({
    rowId: 120,
    guid: "g-120",
    chatIdentifier: "+19735550101",
    date: appleNanos("2024-06-02T00:00:00.000Z"),
  });
  assert.equal(
    isForwardCandidate(older, { lastScannedRowId: 90, activationAt }),
    false,
  );
  assert.equal(
    isForwardCandidate(newer, { lastScannedRowId: 90, activationAt }),
    true,
  );

  withStore((_home, store) => {
    recordBaseline(store, new MemoryMessagesCatalog([scanRow({
      rowId: 90,
      guid: "g-90",
      chatIdentifier: "+15550001111",
      date: appleNanos("2024-05-01T00:00:00.000Z"),
    })]), new Date(activationAt));
    const result = scanForward(
      store,
      new MemoryMessagesCatalog([older, newer]),
      context,
      new Date("2024-06-20T00:00:00.000Z"),
    );
    assert.equal(result.importable.length, 1);
    assert.equal(result.importable[0]?.source_key, "g-120");
    assert.equal(store.readState().lastScannedRowId, 120);
  });
});

test("scanForward accepts SQLite BigInt ROWIDs without import_failed", () => {
  const activationAt = "2024-06-15T12:00:00.000Z";
  withStore((_home, store) => {
    recordBaseline(
      store,
      new MemoryMessagesCatalog([
        scanRow({
          rowId: 90,
          guid: "g-90",
          chatIdentifier: "+15550001111",
          date: appleNanos("2024-05-01T00:00:00.000Z"),
        }),
      ]),
      new Date(activationAt),
    );
    const result = scanForward(
      store,
      new MemoryMessagesCatalog([
        scanRow({
          rowId: BigInt("121"),
          guid: "g-121",
          chatIdentifier: "+19735550101",
          date: appleNanos("2024-06-16T00:00:00.000Z"),
        }),
      ]),
      context,
      new Date("2024-06-20T00:00:00.000Z"),
    );
    assert.equal(result.importable.length, 1);
    assert.equal(result.importable[0]?.source_key, "g-121");
    assert.equal(store.readState().lastScannedRowId, 121);
  });
});

test("new ROWID with occurrence at or before activation is never imported", () => {
  const activationAt = "2024-06-15T12:00:00.000Z";
  const delayedIcloud = scanRow({
    rowId: 200,
    guid: "g-late",
    chatIdentifier: "+19735550101",
    date: appleNanos("2024-06-15T11:00:00.000Z"),
    text: "historical iCloud backfill",
  });
  assert.equal(
    isForwardCandidate(delayedIcloud, { lastScannedRowId: 90, activationAt }),
    false,
  );

  withStore((_home, store) => {
    recordBaseline(
      store,
      new MemoryMessagesCatalog([scanRow({
        rowId: 90,
        guid: "g-90",
        chatIdentifier: "+15551112222",
        date: appleNanos("2024-01-01T00:00:00.000Z"),
      })]),
      new Date(activationAt),
    );
    const result = scanForward(store, new MemoryMessagesCatalog([delayedIcloud]), context);
    assert.equal(result.importable.length, 0);
    assert.equal(result.unresolved.length, 0);
    assert.equal(store.listPendingUnresolved().length, 0);
    assert.equal(store.readState().lastScannedRowId, 200);
  });
});

test("unresolved rows persist ROWID/GUID/date/handle/reason and never a body", () => {
  withStore((_home, store) => {
    const activationAt = new Date("2024-06-01T00:00:00.000Z");
    recordBaseline(
      store,
      new MemoryMessagesCatalog([scanRow({
        rowId: 10,
        guid: "g-10",
        chatIdentifier: "+15550000000",
        date: appleNanos("2024-01-01T00:00:00.000Z"),
      })]),
      activationAt,
    );
    const unmatched = scanRow({
      rowId: 11,
      guid: "g-unmatched",
      chatIdentifier: "+19735550999",
      date: appleNanos("2024-06-02T00:00:00.000Z"),
      text: "secret body must not be stored",
    });
    const result = scanForward(store, new MemoryMessagesCatalog([unmatched]), context);
    assert.equal(result.importable.length, 0);
    assert.equal(result.unresolved.length, 1);
    assert.equal(result.unresolved[0]?.reason, "unmatched");
    const pending = store.listPendingUnresolved();
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.guid, "g-unmatched");
    assert.equal(pending[0]?.rowId, 11);
    assert.equal(pending[0]?.handle, "+19735550999");
    assert.equal(pending[0]?.reason, "unmatched");
    const serialized = JSON.stringify(pending[0]);
    assert.doesNotMatch(serialized, /secret body/);
    store.assertNoBodyColumns();
    assert.ok(!store.unresolvedColumnNames().includes("body"));
    assert.ok(!store.unresolvedColumnNames().includes("text"));
    assert.ok(!store.unresolvedColumnNames().includes("notes"));
  });
});

test("pending unmatched imports after a unique handle exists", () => {
  withStore((_home, store) => {
    recordBaseline(
      store,
      new MemoryMessagesCatalog([scanRow({
        rowId: 1,
        guid: "g-1",
        chatIdentifier: "+15550000000",
        date: appleNanos("2024-01-01T00:00:00.000Z"),
      })]),
      new Date("2024-06-01T00:00:00.000Z"),
    );
    const row = scanRow({
      rowId: 2,
      guid: "g-later",
      chatIdentifier: "+19735550101",
      date: appleNanos("2024-07-01T00:00:00.000Z"),
      text: "hello landon",
    });
    const first = scanForward(
      store,
      new MemoryMessagesCatalog([row]),
      { recruits: [], contacts: new Map(), overrides: {} },
    );
    assert.equal(first.importable.length, 0);
    assert.equal(store.listPendingUnresolved()[0]?.reason, "unmatched");

    const retried = retryUnresolved(store, context);
    assert.equal(retried.newlyMatched.length, 1);
    assert.equal(retried.newlyMatched[0]?.source_key, "g-later");
    assert.equal(retried.newlyMatched[0]?.recruit_person_id, "recruit-1");
    assert.equal(retried.stillPending.length, 0);
    assert.equal(store.listPendingUnresolved().length, 0);
  });
});

test("ambiguous matches stay pending", () => {
  withStore((_home, store) => {
    recordBaseline(
      store,
      new MemoryMessagesCatalog([scanRow({
        rowId: 1,
        guid: "g-1",
        chatIdentifier: "+15550000000",
        date: appleNanos("2024-01-01T00:00:00.000Z"),
      })]),
      new Date("2024-06-01T00:00:00.000Z"),
    );
    const twins = {
      recruits: [
        { id: "a", name: "Alex One", osHandles: ["+19735550101"] },
        { id: "b", name: "Blair Two", osHandles: ["+19735550101"] },
      ],
      contacts: new Map<string, Set<string>>(),
      overrides: {} as Record<string, string>,
    };
    const row = scanRow({
      rowId: 8,
      guid: "g-amb",
      chatIdentifier: "+19735550101",
      date: appleNanos("2024-07-01T00:00:00.000Z"),
    });
    scanForward(store, new MemoryMessagesCatalog([row]), twins);
    const pending = store.listPendingUnresolved();
    assert.equal(pending[0]?.reason, "ambiguous");
    const retried = retryUnresolved(store, twins);
    assert.equal(retried.newlyMatched.length, 0);
    assert.equal(retried.stillPending[0]?.reason, "ambiguous");
  });
});

test("decode_failed rows persist without a body and remain pending on retry", () => {
  withStore((_home, store) => {
    recordBaseline(
      store,
      new MemoryMessagesCatalog([scanRow({
        rowId: 1,
        guid: "g-1",
        chatIdentifier: "+19735550101",
        date: appleNanos("2024-01-01T00:00:00.000Z"),
      })]),
      new Date("2024-06-01T00:00:00.000Z"),
    );
    const garbage = Buffer.from("not-an-nskeyedarchiver-payload", "utf8");
    const row = scanRow({
      rowId: 3,
      guid: "g-decode",
      chatIdentifier: "+19735550101",
      date: appleNanos("2024-07-01T00:00:00.000Z"),
      text: "",
      attributedBody: garbage,
    });
    const result = scanForward(store, new MemoryMessagesCatalog([row]), context);
    assert.equal(result.unresolved[0]?.reason, "decode_failed");
    const pending = store.listPendingUnresolved()[0];
    assert.equal(pending?.reason, "decode_failed");
    assert.doesNotMatch(JSON.stringify(pending), /not-an-nskeyedarchiver/);
    const retried = retryUnresolved(store, context);
    assert.equal(retried.newlyMatched.length, 0);
    assert.equal(retried.stillPending[0]?.reason, "decode_failed");
  });
});

test("a second lock acquire fails until the first is released", () => {
  const home = mkdtempSync(join(tmpdir(), "apple-messages-lock-"));
  const path = syncLockPath(home);
  const first = new ProcessFileLock(path);
  first.acquire();
  const second = new ProcessFileLock(path);
  assert.throws(() => second.acquire(), (error: unknown) => error instanceof SyncLockHeldError);
  first.release();
  second.acquire();
  second.release();
  rmSync(home, { recursive: true, force: true });
});
