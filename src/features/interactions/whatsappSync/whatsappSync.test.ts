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
import { parseWhatsAppHelperConfig, LocalDevHostError } from "./config";
import { isManualWhatsAppSyncAvailable } from "./environment";
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

test("helper config refuses production supabase.co", () => {
  assert.throws(
    () => parseWhatsAppHelperConfig(JSON.stringify({ supabaseUrl: "https://abc.supabase.co" })),
    (error: unknown) => error instanceof LocalDevHostError,
  );
  assert.throws(() => assertLocalDevSupabaseUrl("https://abc.supabase.co"));
  const local = parseWhatsAppHelperConfig(JSON.stringify({ supabaseUrl: "http://127.0.0.1:54321" }));
  assert.equal(local.supabaseUrl, "http://127.0.0.1:54321");
});

test("manual sync available only on local host", () => {
  assert.equal(isManualWhatsAppSyncAvailable("http://127.0.0.1:54321"), true);
  assert.equal(isManualWhatsAppSyncAvailable("http://localhost:54321"), true);
  assert.equal(isManualWhatsAppSyncAvailable("https://xyz.supabase.co"), false);
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
