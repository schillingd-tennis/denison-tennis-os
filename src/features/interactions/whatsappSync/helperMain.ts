/**
 * WhatsApp helper CLI (Mac-local). Read-only toward WhatsApp.
 * Writes to destination Supabase (local fixtures or verified live OS DB).
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ProcessFileLock } from "../appleMessagesSync/lock";
import { assertLocalDevSupabaseUrl } from "../whatsapp";
import {
  clearAuthState,
  formatPairingCodeDisplay,
  hasIncompleteAuthState,
  normalizePairingPhoneDigits,
  pairingCodeSetupInstructions,
  pairingSetupInstructions,
  startBaileysSession,
  type HistorySyncStats,
} from "./baileysSession";
import {
  assertLocalDevSupabaseUrlForHelper,
  helperModeFromUrl,
  LocalDevHostError,
  readWhatsAppHelperConfigFile,
  VERIFIED_PRODUCTION_SUPABASE_URL,
  writeLiveDestinationConfig,
} from "./config";
import { destinationKeyFromUrl, effectiveImportFloor } from "./destination";
import { prepareWhatsAppImport, selectForwardImportMessages, maxCursorFromRows } from "./engine";
import { fixtureCorpus } from "./fixtures";
import { createLiveTickRuntime } from "./liveRuntime";
import { defaultWhatsAppHome, helperConfigPath, syncLockPath, authStatePath } from "./paths";
import { openWhatsAppSyncStore } from "./store";
import { runTick, type TickRuntime } from "./tick";
import { createMemoryWhatsAppWriter, createRecruitingInteractionsWhatsAppWriter } from "./writer";
import type { RecruitMatchInput } from "../appleMessages";

function readHistoryExhaustionHint(home: string): {
  accountSyncCounter: number;
  processedHistoryMessages: number;
  likelyExhausted: boolean;
} {
  const credsPath = join(authStatePath(home), "creds.json");
  if (!existsSync(credsPath)) {
    return { accountSyncCounter: 0, processedHistoryMessages: 0, likelyExhausted: false };
  }
  try {
    const creds = JSON.parse(readFileSync(credsPath, "utf8")) as {
      accountSyncCounter?: number;
      processedHistoryMessages?: unknown[];
    };
    const accountSyncCounter = Number(creds.accountSyncCounter ?? 0);
    const processedHistoryMessages = Array.isArray(creds.processedHistoryMessages)
      ? creds.processedHistoryMessages.length
      : 0;
    return {
      accountSyncCounter,
      processedHistoryMessages,
      likelyExhausted: accountSyncCounter > 0 && processedHistoryMessages > 0,
    };
  } catch {
    return { accountSyncCounter: 0, processedHistoryMessages: 0, likelyExhausted: false };
  }
}

function printSyncStats(stats: HistorySyncStats, home: string): void {
  const exhaustion = readHistoryExhaustionHint(home);
  console.log(
    JSON.stringify({
      history_chunks: stats.historyChunkCount,
      chats: stats.chatCount,
      contacts: stats.contactCount,
      message_conversations: stats.messageConversationCount,
      messages: stats.messageCount,
      lid_mappings: stats.lidMappingCount,
      last_history_at: stats.lastHistoryAt,
      account_sync_counter: exhaustion.accountSyncCounter,
      processed_history_notifications: exhaustion.processedHistoryMessages,
    }),
  );
  if (
    stats.chatCount === 0 &&
    stats.messageCount === 0 &&
    exhaustion.likelyExhausted
  ) {
    console.error(
      "history_sync_exhausted: WhatsApp already delivered companion history once; this session closed before it was persisted. Re-pair required:",
    );
    console.error("  npm run whatsapp-helper -- --disconnect");
    console.error("  npm run whatsapp-helper -- --pair");
    console.error("Leave --pair running until it prints history_sync_complete (do not Ctrl-C at Paired.).");
  }
}

function argValue(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value after ${flag}`);
  }
  return value;
}

function printUsage(): void {
  console.log(`WhatsApp helper (Mac)

  --init-config               Write sample whatsapp.json (local Supabase URL)
  --enable-live-destination   Point whatsapp.json at verified OS DB; set production_activation_at once
  --tick                      Claim queued job → import selected conversation → upsert destination
  --pair                      Start Baileys, print QR, pause for phone scan
  --pair-code                 Link via 8-digit code (requires --phone)
  --phone <+E.164>            Phone for --pair-code (e.g. +15551234567)
  --status                    Show connection / sync status
  --list-chats                List chats after pairing (groups marked)
  --import-conversation       Import ONE conversation by JID (requires --recruit)
  --enable-forward-only       Set “Start importing from” to now if not already set
  --import-fixtures           Run fixture import against memory/local writer (tests)
  --disconnect                Logout + clear local auth session (keeps import_from_at)
  --home <path>               Override App Support whatsapp home

Environment:
  DENISON_WHATSAPP_HOME  Override session home
  Keychain: com.denison.tennis-os.whatsapp (fallback: apple-messages) account supabase-service-role
  Local mode may use SUPABASE_SERVICE_ROLE_KEY env instead of Keychain
`);
}

function logTick(result: { action: string; importedCount: number; jobId: string | null; errorCode: string | null }): void {
  console.log(
    `whatsapp tick action=${result.action} imported=${result.importedCount} job=${result.jobId ?? "-"} error=${result.errorCode ?? "-"}`,
  );
}

async function runPairFlow(options: {
  home: string;
  pairingPhoneDigits?: string;
}): Promise<number> {
  const home = options.home;
  const usePairingCode = Boolean(options.pairingPhoneDigits);
  const store = openWhatsAppSyncStore(home);
  let qrPrinted = false;
  let pairingCodePrinted = false;
  try {
    try {
      ensureConfig(home);
    } catch (error) {
      if (error instanceof LocalDevHostError) {
        console.error(error.message);
        return 1;
      }
      if (existsSync(helperConfigPath(home))) {
        console.error(error instanceof Error ? error.message : error);
        return 1;
      }
      console.warn("No whatsapp.json yet — pairing session only. Run --init-config before import.");
    }

    if (await hasIncompleteAuthState(home)) {
      console.log("Clearing incomplete Baileys auth from a prior failed pair…");
      await clearAuthState(home);
      store.clearSessionMeta();
    }

    store.setConnectionState("connecting");
    if (usePairingCode) {
      console.log(
        "Starting Baileys linked-device (pairing code). Waiting for WhatsApp to issue a code…",
      );
    } else {
      console.log("Starting Baileys linked-device (read-only). Waiting for QR…");
    }

    const session = await startBaileysSession({
      home,
      pairingPhoneDigits: options.pairingPhoneDigits,
      onProgress: (event) => {
        if (event.kind === "qr") {
          const isRefresh = qrPrinted;
          qrPrinted = true;
          store.setConnectionState("qr_ready");
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const qrcode = require("qrcode-terminal") as {
              generate: (text: string, opts?: { small?: boolean }) => void;
            };
            console.log(
              isRefresh
                ? "\nQR refreshed — scan this new code (previous QR expired):\n"
                : "\nScan this QR with WhatsApp → Linked Devices:\n",
            );
            qrcode.generate(event.data, { small: true });
            console.log("");
          } catch {
            console.log("QR payload received (install qrcode-terminal if ASCII QR missing).");
            console.log(`qr_length=${event.data.length}`);
          }
          if (!isRefresh) {
            console.log(pairingSetupInstructions(home));
            console.log("QR_PAIRING_READY");
          } else {
            console.log("QR_PAIRING_READY");
          }
        }
        if (event.kind === "pairing_code") {
          const isRefresh = pairingCodePrinted;
          pairingCodePrinted = true;
          store.setConnectionState("pairing_code_ready");
          const display = formatPairingCodeDisplay(event.code);
          console.log(
            isRefresh
              ? `\nPairing code refreshed — enter this new code (previous expired):\n`
              : `\nPairing code ready — enter on phone:\n`,
          );
          console.log(`  >>>  ${display}  <<<`);
          console.log("");
          if (!isRefresh) {
            console.log(pairingCodeSetupInstructions(home, display));
          }
          console.log("PAIRING_CODE_READY");
        }
        if (event.kind === "connecting") {
          store.setConnectionState("connecting");
        }
        if (event.kind === "open") {
          store.setConnectionState("connected", {
            accountId: event.accountId,
            pairedAt: new Date().toISOString(),
          });
          console.log(`Paired. accountId=${event.accountId}`);
          console.log("Next: npm run whatsapp-helper -- --list-chats");
          console.log("Then import ONE conversation the user selects.");
        }
        if (event.kind === "logged_out") {
          store.setConnectionState("logged_out");
        }
        if (event.kind === "error") {
          const code = event.message.slice(0, 64).replace(/[^a-z0-9_]/gi, "_").toLowerCase();
          store.setError(code);
          if (event.message.startsWith("connection_retry_")) {
            console.log(
              `WhatsApp socket closed (${event.message.replace("connection_retry_", "")}); refreshing…`,
            );
          } else if (event.message.startsWith("pairing_code_failed_")) {
            console.error(event.message);
          }
        }
      },
    });

    if (!qrPrinted && !pairingCodePrinted) {
      try {
        const accountId = await session.waitUntilOpen(30_000);
        store.setConnectionState("connected", {
          accountId,
          pairedAt: new Date().toISOString(),
        });
        console.log(`Already paired. accountId=${accountId}`);
        console.log("Waiting for WhatsApp history sync before exit…");
        await session.resyncChatState();
        const stats = await session.waitForInitialSync(180_000);
        printSyncStats(stats, home);
        if (stats.chatCount > 0 || stats.messageCount > 0) {
          console.log("history_sync_complete");
        }
        await session.close();
        return 0;
      } catch {
        console.log(usePairingCode ? "Waiting for pairing code or connection…" : "Waiting for QR or connection…");
      }
    }

    try {
      const accountId = await session.waitUntilOpen(10 * 60_000);
      console.log(`Pairing complete. accountId=${accountId}`);
      console.log("Waiting for WhatsApp history sync (keep phone unlocked / online)…");
      await session.resyncChatState();
      const stats = await session.waitForInitialSync(240_000);
      printSyncStats(stats, home);
      if (stats.chatCount > 0 || stats.messageCount > 0) {
        console.log("history_sync_complete");
      } else {
        console.error(
          "history_sync_empty: no chats/messages arrived. Leave linked device connected and re-run --list-chats, or re-pair if this persists.",
        );
      }
      console.log(
        usePairingCode
          ? "STOP: report pairing-code success to user; do not broad-import."
          : "STOP: report QR pairing success to user; do not broad-import.",
      );
      await session.close();
      return 0;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      await session.close();
      return qrPrinted || pairingCodePrinted ? 0 : 1;
    }
  } finally {
    store.close();
  }
}

function ensureConfig(home: string): { supabaseUrl: string } {
  const path = helperConfigPath(home);
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. Run: npm run whatsapp-helper -- --init-config`,
    );
  }
  return readWhatsAppHelperConfigFile(path);
}

async function loadDestinationWriter(supabaseUrl: string) {
  const mode = helperModeFromUrl(supabaseUrl);
  if (mode === "local") {
    assertLocalDevSupabaseUrl(supabaseUrl);
  }
  const { createKeychainSecretStore, defaultSecurityRunner } = await import("./secrets");
  const secrets = createKeychainSecretStore(defaultSecurityRunner);
  let key = secrets.readServiceRole();
  if (!key && mode === "local") {
    key =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim() ||
      "";
  }
  if (!key) {
    throw new Error(
      mode === "live"
        ? "keychain_unavailable"
        : "SUPABASE_SERVICE_ROLE_KEY or Keychain is required for WhatsApp import.",
    );
  }
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createRecruitingInteractionsWhatsAppWriter(client as never);
}

function loadRecruitsFromEnv(): RecruitMatchInput[] {
  const raw = process.env.WHATSAPP_RECRUIT_FIXTURE_JSON?.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw) as RecruitMatchInput[];
  return parsed;
}

export async function runWhatsAppHelper(argv: string[], injected?: TickRuntime): Promise<number> {
  if (argv.includes("--help") || argv.length === 0) {
    printUsage();
    return 0;
  }

  const home = argValue(argv, "--home") ?? defaultWhatsAppHome();
  mkdirSync(home, { recursive: true });
  mkdirSync(authStatePath(home), { recursive: true });

  if (argv.includes("--init-config")) {
    const path = helperConfigPath(home);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "http://127.0.0.1:54321";
    try {
      assertLocalDevSupabaseUrlForHelper(url);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return 1;
    }
    writeFileSync(path, `${JSON.stringify({ supabaseUrl: url }, null, 2)}\n`, { mode: 0o600 });
    console.log(`Wrote ${path}`);
    console.log("Service-role keys stay in env / Keychain — never in this file.");
    return 0;
  }

  if (argv.includes("--enable-live-destination")) {
    const path = helperConfigPath(home);
    const store = openWhatsAppSyncStore(home);
    try {
      const config = writeLiveDestinationConfig(path, VERIFIED_PRODUCTION_SUPABASE_URL);
      const activation = store.enableProductionActivation(new Date());
      const importFromAt = store.getImportFromAt();
      console.log(
        JSON.stringify(
          {
            supabaseUrl: config.supabaseUrl,
            productionActivationAt: activation,
            importFromAt,
            note: "Auth and import_from_at preserved. No historical backlog import.",
          },
          null,
          2,
        ),
      );
      return 0;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return 1;
    } finally {
      store.close();
    }
  }

  if (argv.includes("--tick")) {
    if (injected) {
      const result = await runTick(injected);
      logTick(result);
      return result.action === "failed" || result.action === "rejected" ? 2 : 0;
    }
    const runtime = createLiveTickRuntime({ home, now: new Date() });
    try {
      const result = await runTick(runtime);
      logTick(result);
      return result.action === "failed" || result.action === "rejected" ? 2 : 0;
    } finally {
      runtime.store.close();
    }
  }

  if (argv.includes("--status")) {
    const store = openWhatsAppSyncStore(home);
    try {
      const state = store.readState();
      console.log(JSON.stringify(state, null, 2));
      const unmatched = store.listUnmatched();
      console.log(`unmatched_conversations=${unmatched.length}`);
      return 0;
    } finally {
      store.close();
    }
  }

  if (argv.includes("--disconnect")) {
    const lock = new ProcessFileLock(syncLockPath(home));
    lock.acquire();
    const store = openWhatsAppSyncStore(home);
    try {
      await clearAuthState(home);
      store.clearSessionMeta();
      console.log("WhatsApp session cleared. Helper disconnected.");
      return 0;
    } finally {
      store.close();
      lock.release();
    }
  }

  if (argv.includes("--import-fixtures")) {
    const store = openWhatsAppSyncStore(home);
    try {
      const recruits: RecruitMatchInput[] = [
        { id: "recruit-alex", name: "Alex One", osHandles: ["+15551234567"] },
        { id: "recruit-blake", name: "Blake Two", osHandles: ["+447911123456"] },
        { id: "recruit-casey", name: "Casey Three", osHandles: ["+15559876543"] },
        { id: "recruit-drew", name: "Drew Four", osHandles: ["+15559876543"] },
      ];
      const rows = fixtureCorpus();
      const importFromAt = store.ensureImportFromAt(new Date());
      const forward = selectForwardImportMessages(rows, {
        importFromAt,
        cursor: { lastMessageId: null, lastTimestamp: null },
      });
      const existing = new Set<string>();
      const prepared = prepareWhatsAppImport(forward, {
        recruits,
        contacts: new Map(),
        overrides: {},
      }, existing);
      const writer = createMemoryWhatsAppWriter();
      const { inserted } = await writer.upsertInteractions(prepared.importable);
      // Second pass — idempotent
      const again = prepareWhatsAppImport(forward, {
        recruits,
        contacts: new Map(),
        overrides: {},
      }, writer.rows.keys());
      const second = await writer.upsertInteractions(again.importable);
      store.recordSyncCounts({
        at: new Date().toISOString(),
        importedDelta: inserted,
        skippedDelta: prepared.skipped + prepared.groupsExcluded,
        unmatchedDelta: prepared.unmatched + prepared.ambiguous,
      });
      console.log(
        JSON.stringify(
          {
            inserted,
            secondInserted: second.inserted,
            skipped: prepared.skipped,
            unmatched: prepared.unmatched,
            ambiguous: prepared.ambiguous,
            groupsExcluded: prepared.groupsExcluded,
            duplicates: prepared.duplicates,
          },
          null,
          2,
        ),
      );
      return 0;
    } finally {
      store.close();
    }
  }

  if (argv.includes("--pair-code") || argv.includes("--pair")) {
    if (argv.includes("--pair-code") && argv.includes("--pair")) {
      console.error("Use either --pair (QR) or --pair-code (phone code), not both.");
      return 1;
    }
    if (argv.includes("--pair-code")) {
      const phoneRaw = argValue(argv, "--phone");
      if (!phoneRaw) {
        console.error("Missing --phone for --pair-code (example: --phone +15551234567).");
        return 1;
      }
      let pairingPhoneDigits: string;
      try {
        pairingPhoneDigits = normalizePairingPhoneDigits(phoneRaw);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        return 1;
      }
      return runPairFlow({ home, pairingPhoneDigits });
    }
    return runPairFlow({ home });
  }

  if (argv.includes("--list-chats")) {
    const store = openWhatsAppSyncStore(home);
    try {
      const session = await startBaileysSession({
        home,
        onProgress: () => undefined,
      });
      const accountId = await session.waitUntilOpen(60_000);
      store.setConnectionState("connected", { accountId });
      console.log("Waiting for WhatsApp history sync…");
      await session.resyncChatState();
      const stats = await session.waitForInitialSync(180_000);
      printSyncStats(stats, home);
      const chats = await session.listChats();
      const individuals = chats.filter((chat) => !chat.isGroup);
      const groups = chats.filter((chat) => chat.isGroup);
      console.log(`accountId=${accountId}`);
      console.log(`individual_chats=${individuals.length} groups_excluded_from_auto=${groups.length}`);
      for (const chat of individuals.slice(0, 50)) {
        console.log(
          JSON.stringify({
            conversationId: chat.conversationId,
            name: chat.name,
            lastMessageAt: chat.lastMessageAt,
          }),
        );
      }
      if (individuals.length > 50) {
        console.log(`…and ${individuals.length - 50} more individual chats`);
      }
      await session.close();
      return individuals.length > 0 || stats.messageCount > 0 ? 0 : 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      console.error(
        "If unpaired, run: npm run whatsapp-helper -- --pair-code --phone +1… (or --pair)",
      );
      return 1;
    } finally {
      store.close();
    }
  }

  if (argv.includes("--enable-forward-only")) {
    const store = openWhatsAppSyncStore(home);
    try {
      const iso = store.enableForwardOnlyImport(new Date());
      console.log(
        JSON.stringify(
          {
            importFromAt: iso,
            note: "Cutoff preserved across restarts; not reset automatically.",
          },
          null,
          2,
        ),
      );
      return 0;
    } finally {
      store.close();
    }
  }

  if (argv.includes("--import-conversation")) {
    const conversationId = argValue(argv, "--import-conversation");
    const recruitId = argValue(argv, "--recruit");
    if (!conversationId) {
      console.error("--import-conversation requires a JID");
      return 1;
    }
    if (!recruitId) {
      console.error("V1 single-conversation import requires --recruit <person_id>");
      return 1;
    }
    const config = ensureConfig(home);
    const destinationKey = destinationKeyFromUrl(config.supabaseUrl);
    const lock = new ProcessFileLock(syncLockPath(home));
    lock.acquire();
    const store = openWhatsAppSyncStore(home);
    try {
      const writer = await loadDestinationWriter(config.supabaseUrl);
      const session = await startBaileysSession({
        home,
        onProgress: () => undefined,
      });
      const accountId = await session.waitUntilOpen(60_000);
      store.setConnectionState("connected", { accountId });
      store.setSelectedConversation(conversationId, recruitId);
      const importFromAt = store.ensureImportFromAt(new Date());
      const floor = effectiveImportFloor({
        importFromAt,
        productionActivationAt: store.getProductionActivationAt(),
        destinationKey,
      });
      console.log(`Start importing from (forward-only): ${importFromAt}`);
      if (floor && floor !== importFromAt) {
        console.log(`Effective floor (max with production activation): ${floor}`);
      }
      console.log("Waiting for WhatsApp history sync…");
      await session.resyncChatState();
      let stats = await session.waitForInitialSync(180_000);
      printSyncStats(stats, home);

      const requestedOnDemand = await session.requestOnDemandHistory(conversationId, 50);
      if (requestedOnDemand) {
        console.log("Requested on-demand history for conversation; waiting…");
        stats = await session.waitForInitialSync(60_000);
        printSyncStats(stats, home);
      }

      const lid = await session.resolveLidForPn(conversationId);
      const pn = conversationId.endsWith("@lid")
        ? await session.resolvePnForLid(conversationId)
        : null;
      if (lid || pn) {
        console.log(
          JSON.stringify({
            lid_alias: lid,
            pn_alias: pn,
          }),
        );
      }

      const rows = await session.fetchConversationMessages(conversationId);
      const cursor = store.getCursor(destinationKey, conversationId);
      const forward = selectForwardImportMessages(rows, {
        importFromAt: floor,
        cursor,
      });
      let recruits = loadRecruitsFromEnv();
      if (recruits.length === 0) {
        recruits = [{ id: recruitId, name: recruitId, osHandles: [] }];
      }
      const prepared = prepareWhatsAppImport(
        forward,
        {
          recruits,
          contacts: new Map(),
          overrides: {},
          conversationSelections: { [conversationId]: recruitId },
        },
        [],
      );
      const toWrite = prepared.importable.filter(
        (row) => !store.hasImportedKey(destinationKey, row.source_key),
      );
      const { inserted } = await writer.upsertInteractions(toWrite);
      const at = new Date().toISOString();
      store.markImportedKeys(
        destinationKey,
        toWrite.map((row) => ({ sourceKey: row.source_key, conversationId })),
        at,
      );
      const max = maxCursorFromRows(rows);
      if (max.lastMessageId && max.lastTimestamp != null) {
        store.upsertCursor({
          destination: destinationKey,
          conversationId,
          lastMessageId: max.lastMessageId,
          lastTimestamp: max.lastTimestamp,
          importedDelta: inserted,
          at,
        });
      }
      store.recordSyncCounts({
        at,
        importedDelta: inserted,
        skippedDelta: prepared.skipped + prepared.groupsExcluded + (rows.length - forward.length),
        unmatchedDelta: prepared.unmatched + prepared.ambiguous,
      });
      console.log(
        JSON.stringify(
          {
            conversationId,
            recruitId,
            destinationKey,
            importFromAt,
            effectiveFloor: floor,
            fetched: rows.length,
            afterCutoffAndCursor: forward.length,
            inserted,
            skipped: prepared.skipped,
            unmatched: prepared.unmatched,
            ambiguous: prepared.ambiguous,
            onDemandRequested: requestedOnDemand,
          },
          null,
          2,
        ),
      );
      await session.close();
      return rows.length > 0 ? 0 : 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      store.setError("import_failed");
      return 1;
    } finally {
      store.close();
      lock.release();
    }
  }

  printUsage();
  return 1;
}
