/**
 * Baileys multi-device session — read-only toward WhatsApp.
 * Never send, mark-read, or modify conversations.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  detectMediaKind,
  extractWhatsAppText,
  isWhatsAppGroupJid,
  type WhatsAppMessageRow,
} from "../whatsapp";
import type { WhatsAppMediaKind } from "../whatsappNotes";
import { authStatePath, historyCachePath } from "./paths";

export type WhatsAppChatSummary = {
  conversationId: string;
  name: string | null;
  isGroup: boolean;
  lastMessageAt: string | null;
};

export type PairingProgress =
  | { kind: "qr"; data: string }
  | { kind: "pairing_code"; code: string }
  | { kind: "connecting" }
  | { kind: "open"; accountId: string }
  | { kind: "logged_out" }
  | { kind: "error"; message: string };

/** Digits-only MSISDN for Baileys `requestPairingCode` (country code, no +). */
export function normalizePairingPhoneDigits(input: string): string {
  const digits = input.trim().replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new Error(
      "Phone for --pair-code must be 8–15 digits with country code (e.g. +15551234567 or 15551234567).",
    );
  }
  return digits;
}

export type HistorySyncStats = {
  historyChunkCount: number;
  chatCount: number;
  contactCount: number;
  messageConversationCount: number;
  messageCount: number;
  lidMappingCount: number;
  historySyncSettled: boolean;
  lastHistoryAt: string | null;
};

export type BaileysSessionHandle = {
  accountId: string | null;
  waitUntilOpen(timeoutMs?: number): Promise<string>;
  /**
   * Stay connected until history/chat events arrive (or timeout).
   * Does not settle on empty `messaging-history.status` alone.
   */
  waitForInitialSync(timeoutMs?: number): Promise<HistorySyncStats>;
  /** Snapshot of in-memory + disk-backed caches. */
  getSyncStats(): HistorySyncStats;
  /** Best-effort app-state resync to pull chat list metadata. */
  resyncChatState(): Promise<void>;
  /**
   * On-demand history for one chat when a seed message exists in cache.
   * Returns false if no seed (WhatsApp will not invent history from a bare JID).
   */
  requestOnDemandHistory(conversationId: string, count?: number): Promise<boolean>;
  listChats(): Promise<WhatsAppChatSummary[]>;
  fetchConversationMessages(conversationId: string, limit?: number): Promise<WhatsAppMessageRow[]>;
  resolveLidForPn(pnJid: string): Promise<string | null>;
  resolvePnForLid(lidJid: string): Promise<string | null>;
  /** Remember LID↔PN aliases (also seeded for known recruits). */
  rememberLidPnMapping(lidJid: string, pnJid: string): void;
  logout(): Promise<void>;
  close(): Promise<void>;
};

type LongLike = { toNumber?: () => number; low?: number };

type BaileysRawMessage = {
  key?: { id?: string | null; remoteJid?: string | null; fromMe?: boolean | null };
  messageTimestamp?: number | LongLike | null;
  message?: Record<string, unknown> | null;
};

type CachedChat = {
  id: string;
  name: string | null;
  conversationTimestamp: number | null;
};

type CachedContact = {
  id: string;
  name: string | null;
  notify: string | null;
  phoneNumber: string | null;
};

function timestampToNumber(value: number | LongLike | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toNumber === "function") return value.toNumber();
  if (typeof value.low === "number") return value.low;
  return Number(value) || 0;
}

export function rawMessageToRow(accountId: string, raw: BaileysRawMessage): WhatsAppMessageRow | null {
  const messageId = raw.key?.id?.trim();
  const remoteJid = raw.key?.remoteJid?.trim();
  if (!messageId || !remoteJid) return null;
  return {
    accountId,
    conversationId: remoteJid,
    messageId,
    timestamp: timestampToNumber(raw.messageTimestamp),
    fromMe: Boolean(raw.key?.fromMe),
    text: extractWhatsAppText(raw.message ?? null),
    mediaKind: detectMediaKind(raw.message ?? null) as WhatsAppMediaKind | null,
    peerHandle: remoteJid,
    isGroup: isWhatsAppGroupJid(remoteJid),
  };
}

export async function clearAuthState(home: string): Promise<void> {
  const auth = authStatePath(home);
  try {
    rmSync(auth, { recursive: true, force: true });
  } catch {
    // ignore
  }
  mkdirSync(auth, { recursive: true });
}

export function pairingSetupInstructions(home: string): string {
  const auth = authStatePath(home);
  return [
    "",
    "══════════════════════════════════════════════════════════════",
    " WhatsApp pairing — QR READY",
    "══════════════════════════════════════════════════════════════",
    "",
    "1. On your phone open WhatsApp → Settings → Linked Devices → Link a Device",
    "2. Scan the QR code printed in this terminal (fresh QR only — ignore expired ones)",
    "3. Keep this Mac awake until pairing completes",
    "4. Optional: if link still fails, log out of web.whatsapp.com first (max 4 linked devices)",
    "",
    `Session files (gitignored, never logged): ${auth}`,
    `Status DB: ${join(home, "whatsapp-sync.sqlite")}`,
    "",
    "After you scan, leave this process running until it prints paired.",
    "Then run:",
    "  npm run whatsapp-helper -- --status",
    "  npm run whatsapp-helper -- --list-chats",
    "  npm run whatsapp-helper -- --import-conversation <jid>",
    "",
    "Import only ONE recruit conversation until verified. Groups are excluded.",
    "══════════════════════════════════════════════════════════════",
    "",
  ].join("\n");
}

export function pairingCodeSetupInstructions(home: string, formattedCode: string): string {
  const auth = authStatePath(home);
  return [
    "",
    "══════════════════════════════════════════════════════════════",
    " WhatsApp pairing — ENTER CODE ON PHONE",
    "══════════════════════════════════════════════════════════════",
    "",
    `  Pairing code:  ${formattedCode}`,
    "",
    "1. On your phone open WhatsApp → Settings → Linked Devices → Link a Device",
    '2. Tap "Link with phone number instead" (do NOT scan a QR)',
    "3. Enter the 8-digit code above (hyphen optional)",
    "4. Keep this Mac awake until this process prints paired",
    "5. If the code refreshes here, enter the newest code only",
    "6. Optional: unlink an old device first if you are at the 4-device limit",
    "",
    `Session files (gitignored, never logged): ${auth}`,
    `Status DB: ${join(home, "whatsapp-sync.sqlite")}`,
    "",
    "Then run:",
    "  npm run whatsapp-helper -- --status",
    "  npm run whatsapp-helper -- --list-chats",
    "",
    "Import only ONE recruit conversation until verified. Groups are excluded.",
    "══════════════════════════════════════════════════════════════",
    "",
  ].join("\n");
}

/** Format 8-char Baileys code as XXXX-XXXX for phone entry. */
export function formatPairingCodeDisplay(code: string): string {
  const compact = code.replace(/[\s-]/g, "").toUpperCase();
  if (compact.length === 8) return `${compact.slice(0, 4)}-${compact.slice(4)}`;
  return code;
}

type SocketLike = {
  user?: { id?: string } | null;
  authState?: { creds?: { registered?: boolean; accountSyncCounter?: number } };
  requestPairingCode?: (phoneNumber: string) => Promise<string>;
  ev: {
    on: (event: string, cb: (...args: never[]) => void) => void;
  };
  logout: () => Promise<void>;
  end?: (error: Error | undefined) => void;
  resyncAppState?: (
    collections: readonly string[],
    isInitialSync: boolean,
  ) => Promise<void>;
  fetchMessageHistory?: (
    count: number,
    oldestMsgKey: { remoteJid?: string | null; id?: string | null; fromMe?: boolean | null },
    oldestMsgTimestampMs: number,
  ) => Promise<unknown>;
  signalRepository?: {
    lidMapping?: {
      getLIDForPN?: (pn: string) => Promise<string | null>;
      getPNForLID?: (lid: string) => Promise<string | null>;
      storeLIDPNMappings?: (mappings: Array<{ lid: string; pn: string }>) => Promise<void>;
    };
  };
};

type PersistedHistoryCache = {
  version: 1;
  updatedAt: string;
  chats: CachedChat[];
  contacts: CachedContact[];
  messages: Array<{ conversationId: string; raw: BaileysRawMessage }>;
  lidToPn: Record<string, string>;
  pnToLid: Record<string, string>;
};

/** Known recruit LID↔PN aliases observed in prior sessions (non-secret). */
const SEED_LID_PN_MAPPINGS: Array<{ lid: string; pn: string }> = [
  { lid: "34136416845889@lid", pn: "37122497403@s.whatsapp.net" },
];

function normalizeJid(jid: string): string {
  const trimmed = jid.trim();
  const at = trimmed.indexOf("@");
  if (at === -1) return trimmed;
  const user = trimmed.slice(0, at).split(":")[0] ?? trimmed.slice(0, at);
  return `${user}${trimmed.slice(at)}`;
}

function loadPersistedHistory(home: string): PersistedHistoryCache | null {
  const path = historyCachePath(home);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as PersistedHistoryCache;
    if (parsed?.version !== 1 || !Array.isArray(parsed.chats)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedHistory(home: string, cache: PersistedHistoryCache): void {
  const path = historyCachePath(home);
  writeFileSync(path, `${JSON.stringify(cache)}\n`, { mode: 0o600 });
}

/** True when auth exists but is not a completed multi-device registration. */
export async function hasIncompleteAuthState(home: string): Promise<boolean> {
  const credsPath = join(authStatePath(home), "creds.json");
  if (!existsSync(credsPath)) return false;
  try {
    const creds = JSON.parse(readFileSync(credsPath, "utf8")) as {
      registered?: boolean;
      me?: unknown;
    };
    // Partial pair attempts leave me set while registered stays false.
    return creds.registered !== true;
  } catch {
    return true;
  }
}

/**
 * Start Baileys linked-device. Emits QR or pairing_code via onProgress.
 * Read-only: markOnlineOnConnect false; no send APIs used.
 *
 * When `pairingPhoneDigits` is set, uses Baileys `requestPairingCode` (Linked
 * Devices → "Link with phone number instead") instead of printing a QR.
 */
export async function startBaileysSession(options: {
  home: string;
  onProgress: (event: PairingProgress) => void;
  /** Digits-only phone (country code). Enables pairing-code flow when set. */
  pairingPhoneDigits?: string;
}): Promise<BaileysSessionHandle> {
  mkdirSync(authStatePath(options.home), { recursive: true });
  const pairingPhoneDigits = options.pairingPhoneDigits?.trim() || null;

  const baileys = await import("@whiskeysockets/baileys");
  const makeWASocket =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baileys as any).default ?? (baileys as any).makeWASocket;
  if (typeof makeWASocket !== "function") {
    throw new Error("baileys_unavailable");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = baileys as any;
  const useMultiFileAuthState = mod.useMultiFileAuthState as (path: string) => Promise<{
    state: { creds: unknown; keys: unknown };
    saveCreds: () => Promise<void>;
  }>;
  const DisconnectReason = mod.DisconnectReason as {
    loggedOut: number;
    restartRequired: number;
    timedOut: number;
    connectionLost: number;
    badSession: number;
  };
  // Live web.whatsapp.com version — fetchLatestBaileysVersion() can be months stale
  // and causes post-scan "couldn't link" / 408 (QR refs exhausted).
  const fetchLatestWaWebVersion = (mod.fetchLatestWaWebVersion ??
    mod.fetchLatestBaileysVersion) as () => Promise<{
    version: [number, number, number];
  }>;
  const makeCacheableSignalKeyStore = mod.makeCacheableSignalKeyStore as (
    store: unknown,
    logger: unknown,
  ) => unknown;
  const Browsers = mod.Browsers as {
    macOS: (browser: string) => [string, string, string];
  };

  const pinoMod = await import("pino");
  const pino = pinoMod.default ?? pinoMod;
  const logger = pino({ level: "silent" });

  const { version } = await fetchLatestWaWebVersion();
  // Prefer Chrome: Browsers.macOS("Desktop") is rejected with 428 by current WA.
  // Forward-only imports use app-level import_from_at; avoid requesting FULL history.
  // and staying connected until messaging-history.set lands (not the Desktop label).
  const browser = Browsers?.macOS?.("Chrome") ?? (["Mac OS", "Chrome", "14.4.1"] as [
    string,
    string,
    string,
  ]);

  let accountId: string | null = null;
  let openResolve: ((id: string) => void) | null = null;
  let openReject: ((error: Error) => void) | null = null;
  let opened = false;
  let closedIntentionally = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let saveCreds: () => Promise<void> = async () => undefined;
  let pairingCodeIssuedForSocket = false;
  let pairingCodeInFlight = false;
  // Declared before rememberLidPn / hydrateFromDisk — those may touch sock (optional chaining).
  let sock: SocketLike | null = null;
  const openPromise = new Promise<string>((resolve, reject) => {
    openResolve = resolve;
    openReject = reject;
  });

  // Baileys 7 removed makeInMemoryStore / sock.store — cache history events ourselves.
  const chatCache = new Map<string, CachedChat>();
  const contactCache = new Map<string, CachedContact>();
  const messageCache = new Map<string, Map<string, BaileysRawMessage>>();
  const lidToPn = new Map<string, string>();
  const pnToLid = new Map<string, string>();
  let historyChunkCount = 0;
  let lastHistoryAt: string | null = null;
  let historyIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let historySyncWaiters: Array<() => void> = [];
  let historySyncSettled = false;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const getSyncStats = (): HistorySyncStats => {
    let messageCount = 0;
    for (const bucket of messageCache.values()) messageCount += bucket.size;
    return {
      historyChunkCount,
      chatCount: chatCache.size,
      contactCount: contactCache.size,
      messageConversationCount: messageCache.size,
      messageCount,
      lidMappingCount: lidToPn.size,
      historySyncSettled,
      lastHistoryAt,
    };
  };

  const persistCacheSoon = () => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const messages: PersistedHistoryCache["messages"] = [];
      for (const [conversationId, bucket] of messageCache) {
        for (const raw of bucket.values()) {
          messages.push({ conversationId, raw });
        }
      }
      savePersistedHistory(options.home, {
        version: 1,
        updatedAt: new Date().toISOString(),
        chats: [...chatCache.values()],
        contacts: [...contactCache.values()],
        messages,
        lidToPn: Object.fromEntries(lidToPn),
        pnToLid: Object.fromEntries(pnToLid),
      });
    }, 400);
  };

  const rememberLidPn = (lidRaw: string, pnRaw: string) => {
    const lid = normalizeJid(lidRaw);
    const pn = normalizeJid(pnRaw);
    if (!lid.endsWith("@lid") || !pn.endsWith("@s.whatsapp.net")) return;
    lidToPn.set(lid, pn);
    pnToLid.set(pn, lid);
    void sock?.signalRepository?.lidMapping?.storeLIDPNMappings?.([{ lid, pn }]).catch(() => undefined);
  };

  const hydrateFromDisk = () => {
    const persisted = loadPersistedHistory(options.home);
    if (persisted) {
      for (const chat of persisted.chats) {
        if (chat?.id) chatCache.set(chat.id, chat);
      }
      for (const contact of persisted.contacts) {
        if (contact?.id) contactCache.set(contact.id, contact);
      }
      for (const row of persisted.messages ?? []) {
        const jid = row.conversationId || row.raw?.key?.remoteJid?.trim();
        const mid = row.raw?.key?.id?.trim();
        if (!jid || !mid) continue;
        let bucket = messageCache.get(jid);
        if (!bucket) {
          bucket = new Map();
          messageCache.set(jid, bucket);
        }
        bucket.set(mid, row.raw);
      }
      for (const [lid, pn] of Object.entries(persisted.lidToPn ?? {})) rememberLidPn(lid, pn);
      for (const [pn, lid] of Object.entries(persisted.pnToLid ?? {})) rememberLidPn(lid, pn);
      if (chatCache.size > 0 || messageCache.size > 0) {
        lastHistoryAt = persisted.updatedAt;
      }
    }
    for (const seed of SEED_LID_PN_MAPPINGS) rememberLidPn(seed.lid, seed.pn);
  };
  hydrateFromDisk();

  const notifyHistoryWaitersIfReady = (force = false) => {
    const stats = getSyncStats();
    const hasData = stats.chatCount > 0 || stats.messageCount > 0 || stats.contactCount > 0;
    if (!force && !hasData) return;
    if (!historySyncSettled && (force || hasData)) {
      historySyncSettled = true;
      const waiters = historySyncWaiters;
      historySyncWaiters = [];
      for (const resolve of waiters) resolve();
    }
  };

  const markHistoryProgress = (opts?: { settleIfEmptyStatus?: boolean }) => {
    historyChunkCount += 1;
    lastHistoryAt = new Date().toISOString();
    if (historyIdleTimer) clearTimeout(historyIdleTimer);
    // Chunks arrive in bursts; settle after a short idle once we have data.
    historyIdleTimer = setTimeout(() => {
      const stats = getSyncStats();
      if (stats.chatCount > 0 || stats.messageCount > 0 || stats.contactCount > 0) {
        notifyHistoryWaitersIfReady(true);
      } else if (opts?.settleIfEmptyStatus) {
        // Status-only complete with no payload — keep waiting for set/upsert events.
      }
      persistCacheSoon();
    }, 4000);
    persistCacheSoon();
  };

  const upsertChat = (raw: {
    id?: string | null;
    name?: string | null;
    conversationTimestamp?: number | LongLike | null;
    lastMessageRecvTimestamp?: number | null;
  }) => {
    const id = raw.id?.trim();
    if (!id) return;
    const ts =
      timestampToNumber(raw.conversationTimestamp) ||
      (typeof raw.lastMessageRecvTimestamp === "number" ? raw.lastMessageRecvTimestamp : 0) ||
      null;
    const prev = chatCache.get(id);
    chatCache.set(id, {
      id,
      name: raw.name?.trim() || prev?.name || null,
      conversationTimestamp: ts || prev?.conversationTimestamp || null,
    });
  };

  const upsertContact = (raw: {
    id?: string | null;
    name?: string | null;
    notify?: string | null;
    phoneNumber?: string | null;
  }) => {
    const id = raw.id?.trim();
    if (!id) return;
    const prev = contactCache.get(id);
    const phoneNumber = raw.phoneNumber?.trim() || prev?.phoneNumber || null;
    contactCache.set(id, {
      id,
      name: raw.name?.trim() || prev?.name || null,
      notify: raw.notify?.trim() || prev?.notify || null,
      phoneNumber,
    });
    if (id.endsWith("@lid") && phoneNumber) {
      const pn = phoneNumber.includes("@")
        ? normalizeJid(phoneNumber)
        : `${phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
      if (pn.endsWith("@s.whatsapp.net")) rememberLidPn(id, pn);
    }
  };

  const ingestMessages = (raws: BaileysRawMessage[]) => {
    for (const raw of raws) {
      const jid = raw.key?.remoteJid?.trim();
      const mid = raw.key?.id?.trim();
      if (!jid || !mid) continue;
      let bucket = messageCache.get(jid);
      if (!bucket) {
        bucket = new Map();
        messageCache.set(jid, bucket);
      }
      bucket.set(mid, raw);
      if (!chatCache.has(jid)) {
        upsertChat({
          id: jid,
          conversationTimestamp: raw.messageTimestamp,
        });
      }
    }
  };

  const requestPairingCodeIfNeeded = async () => {
    if (!pairingPhoneDigits || pairingCodeIssuedForSocket || pairingCodeInFlight) return;
    if (sock?.authState?.creds?.registered) return;
    if (typeof sock?.requestPairingCode !== "function") {
      options.onProgress({
        kind: "error",
        message: "baileys_request_pairing_code_unavailable",
      });
      return;
    }
    pairingCodeInFlight = true;
    try {
      const code = await sock.requestPairingCode(pairingPhoneDigits);
      pairingCodeIssuedForSocket = true;
      options.onProgress({ kind: "pairing_code", code: String(code) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.onProgress({
        kind: "error",
        message: `pairing_code_failed_${message.slice(0, 80)}`,
      });
    } finally {
      pairingCodeInFlight = false;
    }
  };

  const attachSocket = (next: SocketLike) => {
    sock = next;
    sock.ev.on("creds.update", (() => {
      void saveCreds();
    }) as never);
    sock.ev.on(
      "connection.update",
      ((update: {
        connection?: string;
        lastDisconnect?: { error?: { output?: { statusCode?: number } } };
        qr?: string;
      }) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          if (pairingPhoneDigits) {
            // Baileys still emits qr while using pairing codes — use it as the
            // readiness signal, then request the 8-digit code (do not print QR).
            void requestPairingCodeIfNeeded();
          } else {
            options.onProgress({ kind: "qr", data: qr });
          }
        }
        if (connection === "connecting") options.onProgress({ kind: "connecting" });
        if (connection === "open") {
          const id = sock?.user?.id;
          accountId = id ? String(id).split(":")[0] ?? String(id) : "unknown";
          opened = true;
          options.onProgress({ kind: "open", accountId });
          openResolve?.(accountId);
        }
        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          if (closedIntentionally) return;

          if (statusCode === DisconnectReason.loggedOut) {
            options.onProgress({ kind: "logged_out" });
            openReject?.(new Error("whatsapp_logged_out"));
            return;
          }

          // 515 = expected after pair-success; 408 = QR/timeout — reconnect for a fresh QR/code.
          const isQrTimeout =
            statusCode === DisconnectReason.timedOut ||
            statusCode === DisconnectReason.connectionLost;
          const shouldReconnect =
            !opened ||
            statusCode === DisconnectReason.restartRequired ||
            isQrTimeout;

          if (shouldReconnect) {
            options.onProgress({
              kind: "error",
              message: `connection_retry_${statusCode ?? "unknown"}`,
            });
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              void (async () => {
                // Drop incomplete pair attempts so the next QR/code is clean.
                // Do NOT clear on 515 (restartRequired) — that preserves fresh pair creds.
                if (!opened && isQrTimeout && (await hasIncompleteAuthState(options.home))) {
                  await clearAuthState(options.home);
                }
                await createSocket();
              })();
            }, statusCode === DisconnectReason.restartRequired ? 1500 : 2500);
            return;
          }

          options.onProgress({
            kind: "error",
            message: `connection_closed_${statusCode ?? "unknown"}`,
          });
          openReject?.(new Error(`whatsapp_connection_closed_${statusCode ?? "unknown"}`));
        }
      }) as never,
    );

    sock.ev.on(
      "messaging-history.set",
      ((data: {
        chats?: Array<{
          id?: string | null;
          name?: string | null;
          conversationTimestamp?: number | LongLike | null;
          lastMessageRecvTimestamp?: number | null;
        }>;
        contacts?: Array<{
          id?: string | null;
          name?: string | null;
          notify?: string | null;
          phoneNumber?: string | null;
        }>;
        messages?: BaileysRawMessage[];
        lidPnMappings?: Array<{ lid?: string | null; pn?: string | null }>;
        isLatest?: boolean;
        progress?: number | null;
      }) => {
        for (const chat of data.chats ?? []) upsertChat(chat);
        for (const contact of data.contacts ?? []) upsertContact(contact);
        ingestMessages(data.messages ?? []);
        for (const mapping of data.lidPnMappings ?? []) {
          if (mapping.lid && mapping.pn) rememberLidPn(mapping.lid, mapping.pn);
        }
        markHistoryProgress();
        const hasPayload =
          (data.chats?.length ?? 0) > 0 ||
          (data.contacts?.length ?? 0) > 0 ||
          (data.messages?.length ?? 0) > 0;
        if (hasPayload && (data.isLatest || data.progress === 100 || data.progress == null)) {
          // Keep listening for more chunks; idle timer settles.
        }
      }) as never,
    );
    sock.ev.on(
      "messaging-history.status",
      ((status: { status?: string }) => {
        // Status "complete" often fires before messaging-history.set payloads are
        // flushed from Baileys' event buffer — never settle on empty status alone.
        if (status.status === "complete" || status.status === "paused") {
          markHistoryProgress({ settleIfEmptyStatus: true });
        }
      }) as never,
    );
    sock.ev.on(
      "chats.upsert",
      ((chats: Array<{
        id?: string | null;
        name?: string | null;
        conversationTimestamp?: number | LongLike | null;
        lastMessageRecvTimestamp?: number | null;
      }>) => {
        for (const chat of chats) upsertChat(chat);
        markHistoryProgress();
      }) as never,
    );
    sock.ev.on(
      "chats.update",
      ((updates: Array<{
        id?: string | null;
        name?: string | null;
        conversationTimestamp?: number | LongLike | null;
        lastMessageRecvTimestamp?: number | null;
      }>) => {
        for (const chat of updates) upsertChat(chat);
        if (updates.length) persistCacheSoon();
      }) as never,
    );
    sock.ev.on(
      "contacts.upsert",
      ((contacts: Array<{
        id?: string | null;
        name?: string | null;
        notify?: string | null;
        phoneNumber?: string | null;
      }>) => {
        for (const contact of contacts) upsertContact(contact);
        markHistoryProgress();
      }) as never,
    );
    sock.ev.on(
      "contacts.update",
      ((contacts: Array<{
        id?: string | null;
        name?: string | null;
        notify?: string | null;
        phoneNumber?: string | null;
      }>) => {
        for (const contact of contacts) upsertContact(contact);
        if (contacts.length) persistCacheSoon();
      }) as never,
    );
    sock.ev.on(
      "messages.upsert",
      ((payload: { messages?: BaileysRawMessage[] }) => {
        ingestMessages(payload.messages ?? []);
        if ((payload.messages?.length ?? 0) > 0) {
          markHistoryProgress();
        }
      }) as never,
    );
  };

  const createSocket = async () => {
    if (closedIntentionally) return;
    pairingCodeIssuedForSocket = false;
    pairingCodeInFlight = false;
    const auth = await useMultiFileAuthState(authStatePath(options.home));
    saveCreds = auth.saveCreds;
    const next = makeWASocket({
      version,
      browser,
      logger,
      // Prefer our qrcode-terminal rendering; avoid dead Baileys ASCII after 408.
      printQRInTerminal: false,
      auth: {
        creds: auth.state.creds,
        keys: makeCacheableSignalKeyStore(auth.state.keys, logger),
      },
      markOnlineOnConnect: false,
      // Avoid full phone history pull; app-level import_from_at still enforces the floor.
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      getMessage: async () => undefined,
    }) as SocketLike;
    attachSocket(next);
  };

  await createSocket();

  return {
    get accountId() {
      return accountId;
    },
    waitUntilOpen(timeoutMs = 5 * 60_000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("whatsapp_pair_timeout")), timeoutMs);
        openPromise.then(
          (id) => {
            clearTimeout(timer);
            resolve(id);
          },
          (error) => {
            clearTimeout(timer);
            reject(error);
          },
        );
      });
    },
    waitForInitialSync(timeoutMs = 180_000) {
      const statsNow = getSyncStats();
      // Disk-hydrated data is enough to proceed, but still wait a minimum window
      // for live companion history if the socket just opened.
      const minLiveWaitMs = statsNow.chatCount > 0 || statsNow.messageCount > 0 ? 8_000 : 20_000;

      return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          historySyncSettled = true;
          if (historyIdleTimer) clearTimeout(historyIdleTimer);
          persistCacheSoon();
          resolve(getSyncStats());
        };

        const absoluteTimer = setTimeout(finish, timeoutMs);
        const minTimer = setTimeout(() => {
          const stats = getSyncStats();
          if (stats.chatCount > 0 || stats.messageCount > 0 || stats.contactCount > 0) {
            // Allow a short idle after min wait for trailing chunks.
            if (historyIdleTimer) clearTimeout(historyIdleTimer);
            historyIdleTimer = setTimeout(finish, 4_000);
          }
        }, minLiveWaitMs);

        historySyncWaiters.push(() => {
          clearTimeout(absoluteTimer);
          clearTimeout(minTimer);
          finish();
        });
      });
    },
    getSyncStats,
    async resyncChatState() {
      if (!sock?.resyncAppState) return;
      try {
        await sock.resyncAppState(
          ["critical_block", "critical_unblock_low", "regular_high", "regular_low", "regular"],
          true,
        );
      } catch {
        // Best-effort; history events may still arrive independently.
      }
    },
    async requestOnDemandHistory(conversationId, count = 50) {
      if (!sock?.fetchMessageHistory) return false;
      const aliases = await collectConversationAliases(conversationId);
      let seed: BaileysRawMessage | null = null;
      for (const jid of aliases) {
        const bucket = messageCache.get(jid);
        if (!bucket || bucket.size === 0) continue;
        for (const raw of bucket.values()) {
          if (!seed) {
            seed = raw;
            continue;
          }
          const seedTs = timestampToNumber(seed.messageTimestamp);
          const rawTs = timestampToNumber(raw.messageTimestamp);
          if (rawTs < seedTs) seed = raw;
        }
      }
      if (!seed?.key?.id || !seed.key.remoteJid) return false;
      const ts = timestampToNumber(seed.messageTimestamp);
      const tsMs = ts > 1_000_000_000_000 ? ts : ts * 1000;
      try {
        await sock.fetchMessageHistory(count, seed.key, tsMs);
        return true;
      } catch {
        return false;
      }
    },
    async listChats() {
      const chats: WhatsAppChatSummary[] = [];
      const ids = new Set<string>([...chatCache.keys(), ...contactCache.keys(), ...messageCache.keys()]);
      for (const id of ids) {
        if (id === "status@broadcast" || id.endsWith("@newsletter")) continue;
        const chat = chatCache.get(id);
        const contact = contactCache.get(id);
        const mappedPn = id.endsWith("@lid") ? lidToPn.get(normalizeJid(id)) : null;
        const name =
          chat?.name ||
          contact?.name ||
          contact?.notify ||
          contact?.phoneNumber ||
          mappedPn ||
          null;
        const ts = chat?.conversationTimestamp;
        chats.push({
          conversationId: id,
          name,
          isGroup: id.endsWith("@g.us"),
          lastMessageAt: ts ? new Date(Number(ts) * 1000).toISOString() : null,
        });
      }
      chats.sort((a, b) => {
        const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
        const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
        return bt - at;
      });
      return chats;
    },
    async fetchConversationMessages(conversationId, _limit = 100) {
      if (!accountId) return [];
      const aliases = await collectConversationAliases(conversationId);
      const rows: WhatsAppMessageRow[] = [];
      const seen = new Set<string>();
      for (const jid of aliases) {
        const bucket = messageCache.get(jid);
        if (!bucket) continue;
        for (const raw of bucket.values()) {
          const row = rawMessageToRow(accountId, raw);
          if (!row || seen.has(row.messageId)) continue;
          seen.add(row.messageId);
          // Normalize conversationId to the requested JID for recruit selection matching.
          rows.push({ ...row, conversationId, peerHandle: conversationId });
        }
      }
      rows.sort((a, b) => a.timestamp - b.timestamp);
      return rows;
    },
    async resolveLidForPn(pnJid) {
      const normalized = normalizeJid(pnJid);
      if (pnToLid.has(normalized)) return pnToLid.get(normalized)!;
      try {
        const lid = (await sock?.signalRepository?.lidMapping?.getLIDForPN?.(normalized)) ?? null;
        if (lid) rememberLidPn(lid, normalized);
        return lid;
      } catch {
        return null;
      }
    },
    async resolvePnForLid(lidJid) {
      const normalized = normalizeJid(lidJid);
      if (lidToPn.has(normalized)) return lidToPn.get(normalized)!;
      try {
        const pn = (await sock?.signalRepository?.lidMapping?.getPNForLID?.(normalized)) ?? null;
        if (pn) rememberLidPn(normalized, pn);
        return pn;
      } catch {
        return null;
      }
    },
    rememberLidPnMapping(lidJid, pnJid) {
      rememberLidPn(lidJid, pnJid);
      persistCacheSoon();
    },
    async logout() {
      closedIntentionally = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (historyIdleTimer) clearTimeout(historyIdleTimer);
      if (persistTimer) clearTimeout(persistTimer);
      try {
        await sock?.logout();
      } catch {
        // ignore
      }
      await clearAuthState(options.home);
      try {
        rmSync(historyCachePath(options.home), { force: true });
      } catch {
        // ignore
      }
      accountId = null;
    },
    async close() {
      closedIntentionally = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (historyIdleTimer) clearTimeout(historyIdleTimer);
      if (persistTimer) clearTimeout(persistTimer);
      persistCacheSoon();
      // Flush pending persist before ending socket.
      await new Promise((r) => setTimeout(r, 500));
      try {
        sock?.end?.(undefined);
      } catch {
        // ignore
      }
    },
  };

  async function collectConversationAliases(conversationId: string): Promise<Set<string>> {
    const aliases = new Set<string>([conversationId, normalizeJid(conversationId)]);
    const normalized = normalizeJid(conversationId);
    if (normalized.endsWith("@s.whatsapp.net")) {
      const cachedLid = pnToLid.get(normalized);
      if (cachedLid) aliases.add(cachedLid);
      try {
        const lid = await sock?.signalRepository?.lidMapping?.getLIDForPN?.(normalized);
        if (lid) {
          aliases.add(lid);
          rememberLidPn(lid, normalized);
        }
      } catch {
        // ignore
      }
    } else if (normalized.endsWith("@lid")) {
      const cachedPn = lidToPn.get(normalized);
      if (cachedPn) aliases.add(cachedPn);
      try {
        const pn = await sock?.signalRepository?.lidMapping?.getPNForLID?.(normalized);
        if (pn) {
          const pnNorm = normalizeJid(pn.includes("@") ? pn : `${pn}@s.whatsapp.net`);
          aliases.add(pnNorm);
          aliases.add(pn);
          rememberLidPn(normalized, pnNorm);
        }
      } catch {
        // ignore
      }
    }
    return aliases;
  }
}
