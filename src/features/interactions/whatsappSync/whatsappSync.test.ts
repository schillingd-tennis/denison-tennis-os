import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assertLocalDevSupabaseUrl,
  classifyWhatsAppMessage,
  dedupeBySourceKey,
  handleFromWhatsAppJid,
  isWhatsAppGroupJid,
  parseWhatsAppMessage,
  partitionWhatsAppUpserts,
  whatsappSourceKey,
  whatsappTimestampToIso,
  WHATSAPP_SOURCE_SYSTEM,
} from "../whatsapp";
import { sourceBadgeLabel, unsupportedMediaNotes } from "../whatsappNotes";
import { prepareWhatsAppImport, selectIncrementalMessages, selectMessagesAfterCutoff, selectForwardImportMessages, maxCursorFromRows } from "./engine";
import {
  fixtureCorpus,
  fixtureTextMessage,
  FIXTURE_ACCOUNT_ID,
  FIXTURE_AMBIGUOUS_JID,
  FIXTURE_INTL_JID,
  FIXTURE_RECRUIT_JID,
} from "./fixtures";
import { parseWhatsAppHelperConfig, WhatsAppHelperConfigError } from "./config";
import { isManualWhatsAppSyncAvailable, isLocalWhatsAppMacStatusAvailable } from "./environment";
import {
  destinationKeyFromUrl,
  effectiveImportFloor,
} from "./destination";
import { createMemoryJobQueue } from "./jobQueue";
import { createMemoryPresenceStore } from "./presence";
import { createKeychainSecretStore, createMemorySecretStore } from "./secrets";
import { formatHostedWhatsAppStatus } from "./settingsStatus";
import { runTick, type TickRuntime } from "./tick";
import { ProcessFileLock } from "../appleMessagesSync/lock";
import { syncLockPath } from "./paths";
import { readFileSync } from "node:fs";
import {
  formatPairingCodeDisplay,
  normalizePairingPhoneDigits,
} from "./baileysSession";
import { openWhatsAppSyncStore } from "./store";
import { createMemoryWhatsAppWriter } from "./writer";
import { matchesSource } from "../centralInsights";
import { connectionStateLabel } from "./settingsStatus";
import { interactionTypeLabel } from "../whatsappNotes";

test("whatsapp source_system is distinct from apple_messages", () => {
  assert.equal(WHATSAPP_SOURCE_SYSTEM, "whatsapp");
  assert.notEqual(WHATSAPP_SOURCE_SYSTEM, "apple_messages");
  assert.equal(sourceBadgeLabel("apple_messages"), "Messages");
  assert.equal(sourceBadgeLabel("whatsapp"), "WhatsApp");
  assert.equal(sourceBadgeLabel("coda"), null);
});

test("source key is stable across account + conversation + message", () => {
  const key = whatsappSourceKey({
    accountId: FIXTURE_ACCOUNT_ID,
    conversationId: FIXTURE_RECRUIT_JID,
    messageId: "MSG001",
  });
  assert.equal(key, `${FIXTURE_ACCOUNT_ID}:${FIXTURE_RECRUIT_JID}:MSG001`);
});

test("normalize international and US phones from JIDs", () => {
  assert.equal(handleFromWhatsAppJid("15551234567@s.whatsapp.net"), "+15551234567");
  assert.equal(handleFromWhatsAppJid("447911123456@s.whatsapp.net"), "+447911123456");
  assert.equal(handleFromWhatsAppJid("15551234567:12@s.whatsapp.net"), "+15551234567");
  assert.equal(handleFromWhatsAppJid(FIXTURE_GROUP_JID_SAFE()), null);
});

function FIXTURE_GROUP_JID_SAFE() {
  return "12036301@g.us";
}

test("groups are detected and excluded from parse", () => {
  assert.equal(isWhatsAppGroupJid("12036301@g.us"), true);
  const group = fixtureTextMessage({
    conversationId: "12036301@g.us",
    isGroup: true,
    text: "hello group",
  });
  assert.equal(parseWhatsAppMessage(group), null);
  assert.equal(classifyWhatsAppMessage(group).status, "skip");
});

test("timestamps convert unix seconds to ISO", () => {
  assert.equal(whatsappTimestampToIso(1_700_000_000), new Date(1_700_000_000_000).toISOString());
  assert.equal(whatsappTimestampToIso(1_700_000_000_000), new Date(1_700_000_000_000).toISOString());
});

test("unsupported media is clearly identified", () => {
  const row = fixtureTextMessage({ text: null, mediaKind: "image", messageId: "M-media" });
  const parsed = parseWhatsAppMessage(row);
  assert.ok(parsed);
  assert.equal(parsed!.notes, unsupportedMediaNotes("image"));
  assert.match(parsed!.notes, /Unsupported media/);
});

test("phone matching attaches unique recruit; ambiguous requires review", () => {
  const recruits = [
    { id: "alex", name: "Alex One", osHandles: ["+15551234567"] },
    { id: "blake", name: "Blake Two", osHandles: ["+447911123456"] },
    { id: "casey", name: "Casey Three", osHandles: ["+15559876543"] },
    { id: "drew", name: "Drew Four", osHandles: ["+15559876543"] },
  ];
  const prepared = prepareWhatsAppImport(fixtureCorpus(), {
    recruits,
    contacts: new Map(),
    overrides: {},
  });
  assert.ok(prepared.importable.some((row) => row.recruit_person_id === "alex"));
  assert.ok(prepared.importable.some((row) => row.recruit_person_id === "blake"));
  assert.equal(
    prepared.importable.some((row) => row.participants.includes("15559876543")),
    false,
  );
  assert.ok(prepared.ambiguous >= 1);
  assert.ok(prepared.groupsExcluded >= 1);
});

test("never name-only auto-attach", () => {
  const recruits = [{ id: "alex", name: "Alex One", osHandles: [] }];
  const contacts = new Map<string, Set<string>>();
  // Contact name alone without handle match must not attach when handle is unknown path —
  // resolveHandle contacts path needs handle on contact; empty osHandles + no contact handle → unmatched
  const prepared = prepareWhatsAppImport(
    [fixtureTextMessage({ conversationId: "19998887777@s.whatsapp.net", peerHandle: "19998887777@s.whatsapp.net" })],
    { recruits, contacts, overrides: {} },
  );
  assert.equal(prepared.importable.length, 0);
  assert.ok(prepared.unmatched >= 1);
});

test("explicit conversation selection imports without phone match", () => {
  const recruits = [{ id: "alex", name: "Alex One", osHandles: [] }];
  const prepared = prepareWhatsAppImport(
    [fixtureTextMessage({ conversationId: FIXTURE_AMBIGUOUS_JID, peerHandle: FIXTURE_AMBIGUOUS_JID })],
    {
      recruits,
      contacts: new Map(),
      overrides: {},
      conversationSelections: { [FIXTURE_AMBIGUOUS_JID]: "alex" },
    },
  );
  assert.equal(prepared.importable.length, 1);
  assert.equal(prepared.importable[0]?.recruit_person_id, "alex");
});

test("idempotent upserts skip duplicates by source_key", async () => {
  const recruits = [{ id: "alex", name: "Alex One", osHandles: ["+15551234567"] }];
  const rows = [
    fixtureTextMessage({ messageId: "DUP1" }),
    fixtureTextMessage({ messageId: "DUP1" }),
  ];
  const { unique, duplicateKeys } = dedupeBySourceKey(
    prepareWhatsAppImport(rows, { recruits, contacts: new Map(), overrides: {} }).importable.concat(
      prepareWhatsAppImport(rows, { recruits, contacts: new Map(), overrides: {} }).importable,
    ),
  );
  assert.ok(duplicateKeys.length >= 1 || unique.length === 1);

  const writer = createMemoryWhatsAppWriter();
  const first = prepareWhatsAppImport(rows, { recruits, contacts: new Map(), overrides: {} });
  const a = await writer.upsertInteractions(first.importable);
  const second = prepareWhatsAppImport(rows, { recruits, contacts: new Map(), overrides: {} }, writer.rows.keys());
  const b = await writer.upsertInteractions(second.importable);
  assert.equal(a.inserted, 1);
  assert.equal(b.inserted, 0);
  assert.equal(second.alreadyExisting, 1);
});

test("incremental sync skips older cursor messages", () => {
  const rows = [
    fixtureTextMessage({ messageId: "A", timestamp: 100 }),
    fixtureTextMessage({ messageId: "B", timestamp: 200 }),
    fixtureTextMessage({ messageId: "C", timestamp: 300 }),
  ];
  const next = selectIncrementalMessages(rows, { lastMessageId: "B", lastTimestamp: 200 });
  assert.deepEqual(
    next.map((row) => row.messageId),
    ["C"],
  );
  const max = maxCursorFromRows(rows);
  assert.equal(max.lastMessageId, "C");
  assert.equal(max.lastTimestamp, 300);
});

test("partition skips rows without recruit attachment", () => {
  const row = parseWhatsAppMessage(fixtureTextMessage())!;
  const partitioned = partitionWhatsAppUpserts([row], []);
  assert.equal(partitioned.skipped.length, 1);
  assert.equal(partitioned.toInsert.length, 0);
});

test("helper config accepts local and production; rejects secrets", () => {
  assert.throws(
    () =>
      parseWhatsAppHelperConfig(
        JSON.stringify({ supabaseUrl: "http://127.0.0.1:54321", serviceRoleKey: "x" }),
      ),
    (error: unknown) => error instanceof WhatsAppHelperConfigError,
  );
  assert.throws(() => assertLocalDevSupabaseUrl("https://abc.supabase.co"));
  const local = parseWhatsAppHelperConfig(JSON.stringify({ supabaseUrl: "http://127.0.0.1:54321" }));
  assert.equal(local.supabaseUrl, "http://127.0.0.1:54321");
  const live = parseWhatsAppHelperConfig(
    JSON.stringify({ supabaseUrl: "https://hvctdzhxfpkyflbihvhv.supabase.co" }),
  );
  assert.equal(live.supabaseUrl, "https://hvctdzhxfpkyflbihvhv.supabase.co");
});

test("manual sync available on production host (mirrors Apple Messages)", () => {
  assert.equal(isManualWhatsAppSyncAvailable("http://127.0.0.1:54321"), false);
  assert.equal(isManualWhatsAppSyncAvailable("http://localhost:54321"), false);
  assert.equal(isManualWhatsAppSyncAvailable("https://xyz.supabase.co"), true);
  assert.equal(isManualWhatsAppSyncAvailable("https://hvctdzhxfpkyflbihvhv.supabase.co"), true);
});

test("source filter separates messages and whatsapp", () => {
  assert.equal(matchesSource("apple_messages", "messages"), true);
  assert.equal(matchesSource("whatsapp", "messages"), false);
  assert.equal(matchesSource("whatsapp", "whatsapp"), true);
  assert.equal(matchesSource("apple_messages", "whatsapp"), false);
  assert.equal(matchesSource("apple_messages", "all"), true);
});

test("sync store records counts and unmatched without message bodies", () => {
  const home = mkdtempSync(join(tmpdir(), "wa-sync-"));
  try {
    const store = openWhatsAppSyncStore(home);
    store.setConnectionState("qr_ready");
    store.recordSyncCounts({ at: new Date().toISOString(), importedDelta: 2, skippedDelta: 1, unmatchedDelta: 3 });
    store.upsertUnmatched({
      conversationId: FIXTURE_INTL_JID,
      handle: "+447911123456",
      displayName: null,
      reason: "unmatched",
      messageCount: 4,
      lastMessageAt: null,
    });
    const state = store.readState();
    assert.equal(state.connectionState, "qr_ready");
    assert.equal(state.importedCount, 2);
    assert.equal(store.listUnmatched().length, 1);
    assert.equal(store.listUnmatched()[0]?.handle, "+447911123456");
    store.close();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("writer refuses non-whatsapp source_system", async () => {
  const writer = createMemoryWhatsAppWriter();
  const { inserted } = await writer.upsertInteractions([
    {
      recruit_person_id: "x",
      tournament_id: null,
      occurred_at: new Date().toISOString(),
      interaction_type: "whatsapp",
      channel: "WhatsApp",
      direction: "inbound",
      participants: "+15551234567",
      notes: "hi",
      next_steps: null,
      logged_by: null,
      source_system: "apple_messages" as never,
      source_key: "bad",
    },
  ]);
  assert.equal(inserted, 0);
});

test("pairing phone digits normalize for Baileys requestPairingCode", () => {
  assert.equal(normalizePairingPhoneDigits("+1 (555) 123-4567"), "15551234567");
  assert.equal(normalizePairingPhoneDigits("447911123456"), "447911123456");
  assert.throws(() => normalizePairingPhoneDigits("555"), /8–15 digits/);
  assert.equal(formatPairingCodeDisplay("ABCD1234"), "ABCD-1234");
  assert.equal(formatPairingCodeDisplay("ab-cd-12-34"), "ABCD-1234");
  assert.equal(connectionStateLabel("pairing_code_ready"), "Pairing code ready — enter on phone");
});

test("forward-only cutoff skips older messages and keeps newer", () => {
  const cutoff = "2024-06-15T12:00:00.000Z";
  const older = fixtureTextMessage({
    messageId: "OLD",
    timestamp: Math.floor(Date.parse("2024-06-01T00:00:00.000Z") / 1000),
  });
  const newer = fixtureTextMessage({
    messageId: "NEW",
    timestamp: Math.floor(Date.parse("2024-06-16T00:00:00.000Z") / 1000),
  });
  const kept = selectMessagesAfterCutoff([older, newer], cutoff);
  assert.equal(kept.length, 1);
  assert.equal(kept[0]?.messageId, "NEW");
});

test("forward import applies cutoff then cursor; offline-after-cutoff still imports", () => {
  const cutoff = "2024-06-15T12:00:00.000Z";
  const historical = fixtureTextMessage({
    messageId: "HIST",
    timestamp: Math.floor(Date.parse("2024-01-01T00:00:00.000Z") / 1000),
  });
  const mid = fixtureTextMessage({
    messageId: "MID",
    timestamp: Math.floor(Date.parse("2024-06-16T10:00:00.000Z") / 1000),
  });
  const late = fixtureTextMessage({
    messageId: "LATE",
    timestamp: Math.floor(Date.parse("2024-06-17T10:00:00.000Z") / 1000),
  });
  const first = selectForwardImportMessages([historical, mid, late], {
    importFromAt: cutoff,
    cursor: { lastMessageId: null, lastTimestamp: null },
  });
  assert.deepEqual(
    first.map((row) => row.messageId),
    ["MID", "LATE"],
  );
  const afterMidCursor = selectForwardImportMessages([historical, mid, late], {
    importFromAt: cutoff,
    cursor: { lastMessageId: "MID", lastTimestamp: mid.timestamp },
  });
  assert.deepEqual(
    afterMidCursor.map((row) => row.messageId),
    ["LATE"],
  );
});

test("import_from_at persists and is not overwritten on re-enable", () => {
  const home = mkdtempSync(join(tmpdir(), "wa-cutoff-"));
  try {
    const store = openWhatsAppSyncStore(home);
    const first = store.enableForwardOnlyImport("2024-06-15T12:00:00.000Z");
    assert.equal(first, "2024-06-15T12:00:00.000Z");
    const second = store.enableForwardOnlyImport("2025-01-01T00:00:00.000Z");
    assert.equal(second, "2024-06-15T12:00:00.000Z");
    assert.equal(store.readState().importFromAt, "2024-06-15T12:00:00.000Z");
    store.close();
    const again = openWhatsAppSyncStore(home);
    assert.equal(again.readState().importFromAt, "2024-06-15T12:00:00.000Z");
    again.close();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("parsed WhatsApp rows use interaction_type whatsapp and display label WhatsApp", () => {
  const parsed = parseWhatsAppMessage(fixtureTextMessage({ text: "hello" }));
  assert.ok(parsed);
  assert.equal(parsed!.interaction_type, "whatsapp");
  assert.equal(parsed!.channel, "WhatsApp");
  assert.equal(interactionTypeLabel(parsed!.interaction_type, parsed!.source_system), "WhatsApp");
  assert.equal(interactionTypeLabel("text", "whatsapp"), "WhatsApp");
  assert.equal(interactionTypeLabel("text", "apple_messages"), "Text");
});

test("destination key scopes local vs production host", () => {
  assert.equal(destinationKeyFromUrl("http://127.0.0.1:54321"), "local");
  assert.equal(destinationKeyFromUrl("http://localhost:54321"), "local");
  assert.equal(
    destinationKeyFromUrl("https://hvctdzhxfpkyflbihvhv.supabase.co"),
    "hvctdzhxfpkyflbihvhv.supabase.co",
  );
});

test("effective cutoff uses max(import_from, production_activation) for production", () => {
  assert.equal(
    effectiveImportFloor({
      importFromAt: "2026-09-18T10:36:23.797Z",
      productionActivationAt: "2026-09-18T14:00:00.000Z",
      destinationKey: "hvctdzhxfpkyflbihvhv.supabase.co",
    }),
    "2026-09-18T14:00:00.000Z",
  );
  assert.equal(
    effectiveImportFloor({
      importFromAt: "2026-09-18T10:36:23.797Z",
      productionActivationAt: "2026-09-17T00:00:00.000Z",
      destinationKey: "hvctdzhxfpkyflbihvhv.supabase.co",
    }),
    "2026-09-18T10:36:23.797Z",
  );
  assert.equal(
    effectiveImportFloor({
      importFromAt: "2026-09-18T10:36:23.797Z",
      productionActivationAt: "2026-09-18T14:00:00.000Z",
      destinationKey: "local",
    }),
    "2026-09-18T10:36:23.797Z",
  );
});

test("destination-scoped imported_keys: local receipt does not skip production", () => {
  const home = mkdtempSync(join(tmpdir(), "wa-dest-"));
  try {
    const store = openWhatsAppSyncStore(home);
    const key = "acct:chat:MSG1";
    store.markImportedKeys("local", [{ sourceKey: key, conversationId: "chat" }], new Date().toISOString());
    assert.equal(store.hasImportedKey("local", key), true);
    assert.equal(store.hasImportedKey("hvctdzhxfpkyflbihvhv.supabase.co", key), false);
    store.markImportedKeys(
      "hvctdzhxfpkyflbihvhv.supabase.co",
      [{ sourceKey: key, conversationId: "chat" }],
      new Date().toISOString(),
    );
    assert.equal(store.hasImportedKey("hvctdzhxfpkyflbihvhv.supabase.co", key), true);
    store.close();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("destination-scoped cursors isolate local vs production", () => {
  const home = mkdtempSync(join(tmpdir(), "wa-cursor-"));
  try {
    const store = openWhatsAppSyncStore(home);
    const at = new Date().toISOString();
    store.upsertCursor({
      destination: "local",
      conversationId: "chat@s.whatsapp.net",
      lastMessageId: "L1",
      lastTimestamp: 100,
      importedDelta: 1,
      at,
    });
    assert.equal(store.getCursor("local", "chat@s.whatsapp.net").lastMessageId, "L1");
    assert.equal(store.getCursor("hvctdzhxfpkyflbihvhv.supabase.co", "chat@s.whatsapp.net").lastMessageId, null);
    store.close();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("production_activation_at set once and never auto-reset", () => {
  const home = mkdtempSync(join(tmpdir(), "wa-act-"));
  try {
    const store = openWhatsAppSyncStore(home);
    store.enableForwardOnlyImport("2026-09-18T10:36:23.797Z");
    const first = store.enableProductionActivation("2026-09-18T15:00:00.000Z");
    assert.equal(first, "2026-09-18T15:00:00.000Z");
    const second = store.enableProductionActivation("2026-09-19T00:00:00.000Z");
    assert.equal(second, "2026-09-18T15:00:00.000Z");
    assert.equal(store.readState().importFromAt, "2026-09-18T10:36:23.797Z");
    store.close();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("offline recovery: messages after effective floor import past cursor", () => {
  const floor = "2026-09-18T14:00:00.000Z";
  const before = fixtureTextMessage({
    messageId: "BEFORE",
    timestamp: Math.floor(Date.parse("2026-09-18T13:00:00.000Z") / 1000),
  });
  const mid = fixtureTextMessage({
    messageId: "MID",
    timestamp: Math.floor(Date.parse("2026-09-18T15:00:00.000Z") / 1000),
  });
  const late = fixtureTextMessage({
    messageId: "LATE",
    timestamp: Math.floor(Date.parse("2026-09-18T16:00:00.000Z") / 1000),
  });
  const first = selectForwardImportMessages([before, mid, late], {
    importFromAt: floor,
    cursor: { lastMessageId: null, lastTimestamp: null },
  });
  assert.deepEqual(
    first.map((r) => r.messageId),
    ["MID", "LATE"],
  );
  const afterOffline = selectForwardImportMessages([before, mid, late], {
    importFromAt: floor,
    cursor: { lastMessageId: "MID", lastTimestamp: mid.timestamp },
  });
  assert.deepEqual(
    afterOffline.map((r) => r.messageId),
    ["LATE"],
  );
});

test("job enqueue conflict returns existing active job", async () => {
  const queue = createMemoryJobQueue();
  const a = await queue.enqueueManual("user-1", new Date("2026-09-18T12:00:00.000Z"));
  assert.equal(a.created, true);
  const b = await queue.enqueueManual("user-2", new Date("2026-09-18T12:01:00.000Z"));
  assert.equal(b.created, false);
  assert.equal(b.job.id, a.job.id);
});

test("tick imports selected conversation with destination receipts and dedupe", async () => {
  const home = mkdtempSync(join(tmpdir(), "wa-tick-"));
  try {
    const store = openWhatsAppSyncStore(home);
    store.enableForwardOnlyImport("2026-09-18T10:36:23.797Z");
    store.enableProductionActivation("2026-09-18T10:36:23.797Z");
    store.setSelectedConversation(FIXTURE_RECRUIT_JID, "recruit-alex");
    store.setConnectionState("connected", { accountId: FIXTURE_ACCOUNT_ID });

    const queue = createMemoryJobQueue();
    await queue.enqueueManual("user-1", new Date("2026-09-18T12:00:00.000Z"));
    const writer = createMemoryWhatsAppWriter();
    const presence = createMemoryPresenceStore();
    const lock = new ProcessFileLock(syncLockPath(home));
    const dest = "hvctdzhxfpkyflbihvhv.supabase.co";
    const rows = [
      fixtureTextMessage({
        messageId: "T1",
        timestamp: Math.floor(Date.parse("2026-09-18T11:00:00.000Z") / 1000),
      }),
      fixtureTextMessage({
        messageId: "T1",
        timestamp: Math.floor(Date.parse("2026-09-18T11:00:00.000Z") / 1000),
      }),
    ];

    const runtime: TickRuntime = {
      now: new Date("2026-09-18T12:00:00.000Z"),
      home,
      lock,
      store,
      queue,
      secrets: createMemorySecretStore("test-role"),
      presence,
      writer,
      recruits: {
        async loadMatchContext() {
          return {
            recruits: [{ id: "recruit-alex", name: "Alex", osHandles: ["+15551234567"] }],
            contacts: new Map(),
            overrides: {},
          };
        },
      },
      supabaseUrl: `https://${dest}`,
      destinationKey: dest,
      destinationHost: dest,
      mode: "live",
      connectSession: async () => ({
        accountId: FIXTURE_ACCOUNT_ID,
        close: async () => undefined,
        fetchConversationMessages: async () => rows,
      }),
    };

    const first = await runTick(runtime);
    assert.equal(first.action, "claim");
    assert.equal(first.importedCount, 1);
    assert.equal(store.hasImportedKey(dest, rows[0] ? whatsappSourceKey({
      accountId: FIXTURE_ACCOUNT_ID,
      conversationId: FIXTURE_RECRUIT_JID,
      messageId: "T1",
    }) : ""), true);
    assert.equal(store.hasImportedKey("local", whatsappSourceKey({
      accountId: FIXTURE_ACCOUNT_ID,
      conversationId: FIXTURE_RECRUIT_JID,
      messageId: "T1",
    })), false);
    assert.ok(presence.row?.lastSeenAt);

    await queue.enqueueManual("user-1", new Date("2026-09-18T12:05:00.000Z"));
    runtime.now = new Date("2026-09-18T12:05:00.000Z");
    const second = await runTick(runtime);
    assert.equal(second.action, "claim");
    assert.equal(second.importedCount, 0);
    store.close();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("tick fails when recruit missing in destination catalog", async () => {
  const home = mkdtempSync(join(tmpdir(), "wa-miss-"));
  try {
    const store = openWhatsAppSyncStore(home);
    store.enableForwardOnlyImport("2026-09-18T10:36:23.797Z");
    store.enableProductionActivation("2026-09-18T10:36:23.797Z");
    store.setSelectedConversation(FIXTURE_RECRUIT_JID, "missing-recruit");
    const queue = createMemoryJobQueue();
    await queue.enqueueManual("user-1", new Date());
    const runtime: TickRuntime = {
      now: new Date(),
      home,
      lock: new ProcessFileLock(syncLockPath(home)),
      store,
      queue,
      secrets: createMemorySecretStore("test-role"),
      presence: createMemoryPresenceStore(),
      writer: createMemoryWhatsAppWriter(),
      recruits: {
        async loadMatchContext() {
          return {
            recruits: [{ id: "other", name: "Other", osHandles: [] }],
            contacts: new Map(),
            overrides: {},
          };
        },
      },
      supabaseUrl: "https://hvctdzhxfpkyflbihvhv.supabase.co",
      destinationKey: "hvctdzhxfpkyflbihvhv.supabase.co",
      destinationHost: "hvctdzhxfpkyflbihvhv.supabase.co",
      mode: "live",
      connectSession: async () => ({
        accountId: FIXTURE_ACCOUNT_ID,
        close: async () => undefined,
        fetchConversationMessages: async () => [],
      }),
    };
    const result = await runTick(runtime);
    assert.equal(result.action, "failed");
    assert.equal(result.errorCode, "recruit_missing_in_destination");
    store.close();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("hosted status formatting does not require filesystem", () => {
  const status = formatHostedWhatsAppStatus({
    presence: {
      lastSeenAt: new Date().toISOString(),
      connectionState: "connected",
      accountId: "acct",
      destinationHost: "hvctdzhxfpkyflbihvhv.supabase.co",
      importFromAt: "2026-09-18T10:36:23.797Z",
      productionActivationAt: "2026-09-18T15:00:00.000Z",
      selectedConversationId: "chat",
      lastErrorCode: null,
      importedCount: 3,
      skippedCount: 1,
      unmatchedCount: 0,
    },
    jobs: {
      activeJob: null,
      lastCompleted: {
        id: "j1",
        trigger: "manual",
        status: "completed",
        requestedBy: "u",
        requestedAt: "2026-09-18T15:01:00.000Z",
        startedAt: "2026-09-18T15:01:01.000Z",
        heartbeatAt: "2026-09-18T15:01:02.000Z",
        leaseExpiresAt: null,
        finishedAt: "2026-09-18T15:01:05.000Z",
        importedCount: 2,
        errorCode: null,
      },
      lastFinished: null,
      lastCompletedWithImports: null,
    },
  });
  assert.equal(status.helperOnline, true);
  assert.equal(status.destinationHost, "hvctdzhxfpkyflbihvhv.supabase.co");
  assert.equal(status.importFromAt, "2026-09-18T10:36:23.797Z");
  assert.equal(status.productionActivationAt, "2026-09-18T15:00:00.000Z");
  assert.equal(isLocalWhatsAppMacStatusAvailable("http://127.0.0.1:54321"), true);
  assert.equal(isLocalWhatsAppMacStatusAvailable("https://hvctdzhxfpkyflbihvhv.supabase.co"), false);
});

test("hosted getWhatsAppSyncStatusAction path never opens Mac store (source)", () => {
  const actions = readFileSync(join(process.cwd(), "src/features/interactions/whatsappSync/actions.ts"), "utf8");
  assert.match(actions, /isManualWhatsAppSyncAvailable/);
  assert.match(actions, /formatHostedWhatsAppStatus/);
  assert.match(actions, /createSupabasePresenceStore/);
  assert.match(actions, /createSupabaseJobStore/);
  // Production branch reads jobs+presence before any Mac sqlite open.
  const hostedBlock = actions.slice(
    actions.indexOf("if (isManualWhatsAppSyncAvailable())"),
    actions.indexOf("if (isLocalWhatsAppMacStatusAvailable())"),
  );
  assert.match(hostedBlock, /readStatusForUser|createJobQueue/);
  assert.doesNotMatch(hostedBlock, /openWhatsAppSyncStore/);
  assert.doesNotMatch(hostedBlock, /defaultWhatsAppHome/);
});

test("0066 presence migration defines singleton RLS without message bodies", () => {
  const sqlPath = join(process.cwd(), "supabase/migrations/0066_whatsapp_helper_presence.sql");
  const sql = readFileSync(sqlPath, "utf8");
  assert.match(sql, /create table if not exists public\.whatsapp_helper_presence/);
  assert.match(sql, /id integer primary key check \(id = 1\)/);
  assert.match(sql, /last_seen_at/);
  assert.match(sql, /production_activation_at/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /grant select on table public\.whatsapp_helper_presence to authenticated/);
  assert.doesNotMatch(sql, /\bnotes\b/);
  assert.doesNotMatch(sql, /message_body/);
  assert.match(sql, /comment on table public\.whatsapp_sync_jobs/);
});

test("keychain secret store prefers whatsapp then falls back to apple-messages", () => {
  const calls: string[] = [];
  const store = createKeychainSecretStore((_bin, args) => {
    const service = args[args.indexOf("-s") + 1]!;
    calls.push(service);
    if (service === "com.denison.tennis-os.whatsapp") {
      throw new Error("not found");
    }
    return "fallback-secret\n";
  });
  assert.equal(store.readServiceRole(), "fallback-secret");
  assert.deepEqual(calls, [
    "com.denison.tennis-os.whatsapp",
    "com.denison.tennis-os.apple-messages",
  ]);
});
