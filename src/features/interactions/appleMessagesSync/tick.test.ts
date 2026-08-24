import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { APPLE_EPOCH_MS, type RecruitMatchInput } from "../appleMessages";
import { MemoryMessagesCatalog } from "./catalog";
import { recordBaseline } from "./engine";
import { runHelper } from "./helperMain";
import { createMemoryJobQueue } from "./jobQueue";
import { ProcessFileLock, SyncLockHeldError } from "./lock";
import { syncLockPath } from "./paths";
import { createStaticRecruitCatalog } from "./recruits";
import { createMemorySecretStore } from "./secrets";
import { type AppleScanRow } from "./scan";
import { openSyncStore } from "./store";
import { runTick, type TickRuntime } from "./tick";
import { createMemoryProductionWriter } from "./writer";

const PROD_URL = "https://abcdefghijklmnop.supabase.co";

function appleNanos(iso: string): bigint {
  const millis = Date.parse(iso) - APPLE_EPOCH_MS;
  return BigInt(millis) * BigInt(1_000_000);
}

function scanRow(
  partial: Partial<AppleScanRow> & Pick<AppleScanRow, "rowId" | "guid" | "chatIdentifier" | "date">,
): AppleScanRow {
  return {
    isFromMe: 0,
    text: "hello",
    attributedBody: null,
    associatedMessageType: 0,
    serviceName: "iMessage",
    ...partial,
  };
}

const recruit: RecruitMatchInput = {
  id: "recruit-1",
  name: "Alex One",
  osHandles: ["+19735550101"],
};

const matchContext = {
  recruits: [recruit],
  contacts: new Map<string, Set<string>>(),
  overrides: {} as Record<string, string>,
};

function local(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(year, month, day, hour, minute, 0, 0);
}

async function withRuntime(
  fn: (
    runtime: TickRuntime,
    home: string,
    queue: ReturnType<typeof createMemoryJobQueue>,
  ) => Promise<void>,
  options?: {
    now?: Date;
    rows?: AppleScanRow[];
    secret?: string | null;
    supabaseUrl?: string;
    recruits?: RecruitMatchInput[];
  },
): Promise<void> {
  const home = mkdtempSync(join(tmpdir(), "apple-messages-tick-"));
  const store = openSyncStore(home);
  const queue = createMemoryJobQueue();
  const writer = createMemoryProductionWriter();
  const catalog = new MemoryMessagesCatalog(options?.rows ?? []);
  const runtime: TickRuntime = {
    now: options?.now ?? local(2026, 7, 18, 8, 0),
    home,
    lock: new ProcessFileLock(syncLockPath(home)),
    store,
    catalog,
    queue,
    secrets: createMemorySecretStore(options?.secret === undefined ? "service-role" : options.secret),
    writer,
    recruits: createStaticRecruitCatalog({
      recruits: options?.recruits ?? [recruit],
      contacts: new Map(),
      overrides: {},
    }),
    supabaseUrl: options?.supabaseUrl ?? PROD_URL,
    leaseMs: 60_000,
  };
  try {
    await fn(runtime, home, queue);
  } finally {
    store.close();
    rmSync(home, { recursive: true, force: true });
  }
}

function appendAfterBaseline(catalog: MemoryMessagesCatalog, rows: AppleScanRow[]): void {
  catalog.rows.push(...rows);
}

test("a held lock returns lock_held without touching the queue", async () => {
  await withRuntime(async (runtime, home) => {
    const other = new ProcessFileLock(syncLockPath(home));
    other.acquire();
    try {
      const result = await runTick(runtime);
      assert.equal(result.action, "lock_held");
      assert.equal(result.errorCode, "lock_held");
      assert.equal(result.importedCount, 0);
    } finally {
      other.release();
    }
  });
});

test("tick without a baseline records one and does not claim a queued manual job", async () => {
  const now = local(2026, 7, 17, 10, 0);
  await withRuntime(
    async (runtime) => {
      await runtime.queue.enqueueManual("user-1", now);
      const result = await runTick(runtime);
      assert.equal(result.action, "baseline");
      assert.equal(result.importedCount, 0);
      assert.equal(runtime.store.hasBaseline(), true);
      const status = await runtime.queue.getStatus();
      assert.equal(status.activeJob?.status, "queued");
      assert.equal(status.activeJob?.trigger, "manual");
    },
    {
      now,
      rows: [
        scanRow({
          rowId: 40,
          guid: "g-40",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-01T00:00:00.000Z"),
        }),
      ],
    },
  );
});

test("manual queue claim runs at 10:00 after a successful night", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const now = local(2026, 7, 18, 10, 0);
  await withRuntime(
    async (runtime) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      appendAfterBaseline(runtime.catalog as MemoryMessagesCatalog, [
        scanRow({
          rowId: 80,
          guid: "g-80",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-17T16:00:00.000Z"),
        }),
      ]);
      runtime.store.markImportSuccess(local(2026, 7, 17, 23, 3).toISOString());
      await runtime.queue.enqueueManual("user-1", now);
      const result = await runTick(runtime);
      assert.equal(result.action, "claim");
      assert.equal(result.importedCount, 1);
      assert.equal((runtime.writer as ReturnType<typeof createMemoryProductionWriter>).rows.has("g-80"), true);
      const status = await runtime.queue.getStatus();
      assert.equal(status.activeJob, null);
      assert.equal(status.lastCompleted?.trigger, "manual");
      assert.equal(status.lastCompleted?.importedCount, 1);
    },
    {
      now,
      rows: [
        scanRow({
          rowId: 40,
          guid: "g-40",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-01T00:00:00.000Z"),
        }),
      ],
    },
  );
});

test("11:00 PM local tick enqueues and completes a scheduled job", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const now = local(2026, 7, 17, 23, 1);
  await withRuntime(
    async (runtime) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      appendAfterBaseline(runtime.catalog as MemoryMessagesCatalog, [
        scanRow({
          rowId: 90,
          guid: "g-90",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-17T16:30:00.000Z"),
        }),
      ]);
      const result = await runTick(runtime);
      assert.equal(result.action, "scheduled");
      assert.equal(result.importedCount, 1);
      const status = await runtime.queue.getStatus();
      assert.equal(status.lastCompleted?.trigger, "scheduled");
    },
    {
      now,
      rows: [
        scanRow({
          rowId: 10,
          guid: "g-10",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-01T00:00:00.000Z"),
        }),
      ],
    },
  );
});

test("missed-night catch-up runs at 08:00 when last night never succeeded", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const now = local(2026, 7, 18, 8, 0);
  await withRuntime(
    async (runtime) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      appendAfterBaseline(runtime.catalog as MemoryMessagesCatalog, [
        scanRow({
          rowId: 91,
          guid: "g-91",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-17T16:30:00.000Z"),
        }),
      ]);
      const result = await runTick(runtime);
      assert.equal(result.action, "catch_up");
      assert.equal(result.importedCount, 1);
      const status = await runtime.queue.getStatus();
      assert.equal(status.lastCompleted?.trigger, "catch_up");
    },
    {
      now,
      rows: [
        scanRow({
          rowId: 10,
          guid: "g-10",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-01T00:00:00.000Z"),
        }),
      ],
    },
  );
});

test("expired running leases are failed so the next tick can start work", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const t0 = local(2026, 7, 17, 23, 1);
  await withRuntime(
    async (runtime, _home, queue) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      await runtime.queue.enqueueManual("user-1", t0);
      const claimed = await runtime.queue.claimQueued(t0, 60_000);
      assert.ok(claimed);
      runtime.now = local(2026, 7, 18, 8, 0);
      const result = await runTick(runtime);
      assert.equal(result.expiredLeases, 1);
      assert.equal(result.action, "catch_up");
      const failed = queue.store.jobs.find((job) => job.id === claimed.id);
      assert.equal(failed?.status, "failed");
      assert.equal(failed?.errorCode, "lease_expired");
      const status = await runtime.queue.getStatus();
      assert.equal(status.lastCompleted?.trigger, "catch_up");
    },
    {
      now: t0,
      rows: [
        scanRow({
          rowId: 10,
          guid: "g-10",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-01T00:00:00.000Z"),
        }),
        scanRow({
          rowId: 92,
          guid: "g-crash",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-17T16:30:00.000Z"),
        }),
      ],
    },
  );
});

test("localhost supabase URL is rejected before a job is claimed", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const now = local(2026, 7, 18, 8, 0);
  await withRuntime(
    async (runtime) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      await runtime.queue.enqueueManual("user-1", now);
      const result = await runTick(runtime);
      assert.equal(result.action, "rejected");
      assert.equal(result.errorCode, "host_not_production");
      const status = await runtime.queue.getStatus();
      assert.equal(status.activeJob?.status, "queued");
    },
    { now, supabaseUrl: "http://127.0.0.1:54321" },
  );
});

test("missing Keychain secret fails closed without claiming work", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const now = local(2026, 7, 18, 8, 0);
  await withRuntime(
    async (runtime) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      await runtime.queue.enqueueManual("user-1", now);
      const result = await runTick(runtime);
      assert.equal(result.action, "failed");
      assert.equal(result.errorCode, "keychain_unavailable");
      const status = await runtime.queue.getStatus();
      assert.equal(status.activeJob?.status, "queued");
    },
    { now, secret: null },
  );
});

test("GUID upserts are idempotent and the scan cursor still advances", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const now = local(2026, 7, 18, 8, 0);
  const rows = [
    scanRow({
      rowId: 10,
      guid: "g-10",
      chatIdentifier: "+19735550101",
      date: appleNanos("2026-08-01T00:00:00.000Z"),
    }),
  ];
  await withRuntime(
    async (runtime) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      appendAfterBaseline(runtime.catalog as MemoryMessagesCatalog, [
        scanRow({
          rowId: 95,
          guid: "g-dup",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-17T16:30:00.000Z"),
        }),
      ]);
      await runtime.queue.enqueueManual("user-1", now);
      const first = await runTick(runtime);
      assert.equal(resultAction(first), "claim");
      assert.equal(first.importedCount, 1);
      assert.equal(runtime.store.readState().lastScannedRowId, 95);
      await runtime.queue.enqueueManual("user-1", now);
      const writer = runtime.writer as ReturnType<typeof createMemoryProductionWriter>;
      const secondInsert = await writer.upsertInteractions([...writer.rows.values()]);
      assert.equal(secondInsert.inserted, 0);
    },
    { now, rows },
  );
});

function resultAction(result: { action: string }): string {
  return result.action;
}

test("unresolved unmatched rows retry on a later tick once a recruit exists", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const now = local(2026, 7, 18, 8, 0);
  const rows = [
    scanRow({
      rowId: 10,
      guid: "g-10",
      chatIdentifier: "+15550000000",
      date: appleNanos("2026-08-01T00:00:00.000Z"),
    }),
  ];
  await withRuntime(
    async (runtime) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      appendAfterBaseline(runtime.catalog as MemoryMessagesCatalog, [
        scanRow({
          rowId: 96,
          guid: "g-later",
          chatIdentifier: "+19735550101",
          date: appleNanos("2026-08-17T16:30:00.000Z"),
        }),
      ]);
      await runtime.queue.enqueueManual("user-1", now);
      const first = await runTick(runtime);
      assert.equal(first.action, "claim");
      assert.equal(first.importedCount, 0);
      assert.equal(runtime.store.listPendingUnresolved()[0]?.guid, "g-later");
      runtime.recruits = createStaticRecruitCatalog(matchContext);
      await runtime.queue.enqueueManual("user-1", now);
      const second = await runTick(runtime);
      assert.equal(second.action, "claim");
      assert.equal(second.importedCount, 1);
      assert.equal(runtime.store.listPendingUnresolved().length, 0);
      assert.equal((runtime.writer as ReturnType<typeof createMemoryProductionWriter>).rows.get("g-later")?.recruit_person_id, "recruit-1");
    },
    { now, rows, recruits: [] },
  );
});

test("helper --tick with an injected runtime never loads live adapters", async () => {
  const activation = local(2026, 7, 17, 10, 0);
  const now = local(2026, 7, 18, 8, 0);
  await withRuntime(
    async (runtime) => {
      recordBaseline(runtime.store, runtime.catalog, activation);
      runtime.store.markImportSuccess(local(2026, 7, 17, 23, 3).toISOString());
      const code = await runHelper(["--home", runtime.home, "--tick"], runtime);
      assert.equal(code, 0);
    },
    { now },
  );
});
