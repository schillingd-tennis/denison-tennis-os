/**
 * Pure WhatsApp → recruiting_interactions mapping.
 *
 * Matching reuses normalizeHandle / resolveHandle from Apple Messages.
 * This module never writes to WhatsApp, Contacts, or recruiting_interactions.
 */

import {
  attachRecruit,
  isLocalSupabaseHost,
  isProductionSupabaseHost,
  normalizeHandle,
  resolveHandle,
  type HandleResolution,
  type MatchedThread,
  type RecruitMatchInput,
} from "./appleMessages";
import {
  unsupportedMediaNotes,
  WHATSAPP_SOURCE_SYSTEM,
  type WhatsAppMediaKind,
} from "./whatsappNotes";

export { WHATSAPP_SOURCE_SYSTEM, unsupportedMediaNotes };
export { normalizeHandle, resolveHandle, attachRecruit };

export type WhatsAppMessageRow = {
  /** Linked WhatsApp account id (digits / me id), never a session blob. */
  accountId: string;
  /** Conversation id (remote JID). */
  conversationId: string;
  /** Stable WhatsApp message id (key.id). */
  messageId: string;
  /** Unix seconds or milliseconds. */
  timestamp: number;
  fromMe: boolean;
  text: string | null;
  mediaKind?: WhatsAppMediaKind | null;
  /** Raw remote participant phone/JID for matching (1:1 chats). */
  peerHandle: string | null;
  isGroup?: boolean;
};

export type WhatsAppProposedInteraction = {
  recruit_person_id: string;
  tournament_id: null;
  occurred_at: string;
  interaction_type: "whatsapp";
  channel: "WhatsApp";
  direction: "inbound" | "outbound";
  participants: string;
  notes: string;
  next_steps: null;
  logged_by: null;
  source_system: typeof WHATSAPP_SOURCE_SYSTEM;
  source_key: string;
};

export type WhatsAppSkipReason =
  | "group"
  | "no_message_id"
  | "invalid_handle"
  | "empty"
  | "no_account"
  | "no_conversation";

export type ClassifiedWhatsAppMessage =
  | { status: "ok"; record: WhatsAppProposedInteraction; handle: string }
  | { status: "skip"; reason: WhatsAppSkipReason; handle: string | null };

/** Idempotent identity: source + account + conversation + message. */
export function whatsappSourceKey(input: {
  accountId: string;
  conversationId: string;
  messageId: string;
}): string {
  const account = input.accountId.trim();
  const conversation = input.conversationId.trim();
  const message = input.messageId.trim();
  return `${account}:${conversation}:${message}`;
}

export function isWhatsAppGroupJid(jid: string | null | undefined): boolean {
  if (!jid) return false;
  const value = jid.trim().toLowerCase();
  return value.endsWith("@g.us") || value.includes("@g.us");
}

/**
 * Extract a matchable phone/email from a WhatsApp JID or raw handle.
 * Group JIDs return null. Never guesses country codes beyond normalizeHandle.
 */
export function handleFromWhatsAppJid(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const raw = jid.trim();
  if (!raw || isWhatsAppGroupJid(raw)) return null;
  const beforeAt = raw.includes("@") ? raw.slice(0, raw.indexOf("@")) : raw;
  // Strip device suffix (e.g. 15551234567:12)
  const user = beforeAt.includes(":") ? beforeAt.slice(0, beforeAt.indexOf(":")) : beforeAt;
  if (user.includes("@")) return normalizeHandle(user);
  if (/^\d+$/.test(user)) {
    return normalizeHandle(user.startsWith("+") ? user : `+${user}`);
  }
  return normalizeHandle(user);
}

export function whatsappTimestampToIso(raw: number): string {
  if (!Number.isFinite(raw) || raw <= 0) {
    return new Date(0).toISOString();
  }
  // Baileys uses unix seconds; accept ms if clearly so.
  const ms = raw > 1_000_000_000_000 ? raw : raw * 1000;
  return new Date(ms).toISOString();
}

export function directionFromWhatsApp(fromMe: boolean): "inbound" | "outbound" {
  return fromMe ? "outbound" : "inbound";
}

export function detectMediaKind(message: Record<string, unknown> | null | undefined): WhatsAppMediaKind | null {
  if (!message) return null;
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.stickerMessage) return "sticker";
  if (message.locationMessage || message.liveLocationMessage) return "location";
  if (message.contactMessage || message.contactsArrayMessage) return "contact";
  if (message.reactionMessage) return "reaction";
  if (message.pollCreationMessage || message.pollUpdateMessage) return "poll";
  return null;
}

export function extractWhatsAppText(message: Record<string, unknown> | null | undefined): string | null {
  if (!message) return null;
  if (typeof message.conversation === "string" && message.conversation.trim()) {
    return message.conversation.trim();
  }
  const extended = message.extendedTextMessage;
  if (extended && typeof extended === "object") {
    const text = (extended as { text?: unknown }).text;
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  const image = message.imageMessage;
  if (image && typeof image === "object") {
    const caption = (image as { caption?: unknown }).caption;
    if (typeof caption === "string" && caption.trim()) return caption.trim();
  }
  const video = message.videoMessage;
  if (video && typeof video === "object") {
    const caption = (video as { caption?: unknown }).caption;
    if (typeof caption === "string" && caption.trim()) return caption.trim();
  }
  const doc = message.documentMessage;
  if (doc && typeof doc === "object") {
    const caption = (doc as { caption?: unknown }).caption;
    if (typeof caption === "string" && caption.trim()) return caption.trim();
  }
  return null;
}

export function parseWhatsAppMessage(row: WhatsAppMessageRow): WhatsAppProposedInteraction | null {
  if (row.isGroup || isWhatsAppGroupJid(row.conversationId)) return null;
  const accountId = row.accountId?.trim();
  const conversationId = row.conversationId?.trim();
  const messageId = row.messageId?.trim();
  if (!accountId || !conversationId || !messageId) return null;

  const handle =
    handleFromWhatsAppJid(row.peerHandle) ??
    handleFromWhatsAppJid(row.conversationId);
  if (!handle) return null;

  const text = row.text?.trim() || null;
  const mediaKind = row.mediaKind ?? null;
  let notes: string | null = text;
  if (!notes && mediaKind) {
    notes = unsupportedMediaNotes(mediaKind);
  }
  if (!notes) return null;

  return {
    recruit_person_id: "",
    tournament_id: null,
    occurred_at: whatsappTimestampToIso(row.timestamp),
    interaction_type: "whatsapp",
    channel: "WhatsApp",
    direction: directionFromWhatsApp(row.fromMe),
    participants: handle,
    notes,
    next_steps: null,
    logged_by: null,
    source_system: WHATSAPP_SOURCE_SYSTEM,
    source_key: whatsappSourceKey({ accountId, conversationId, messageId }),
  };
}

export function classifyWhatsAppMessage(row: WhatsAppMessageRow): ClassifiedWhatsAppMessage {
  if (!row.accountId?.trim()) return { status: "skip", reason: "no_account", handle: null };
  if (!row.conversationId?.trim()) return { status: "skip", reason: "no_conversation", handle: null };
  if (row.isGroup || isWhatsAppGroupJid(row.conversationId)) {
    return { status: "skip", reason: "group", handle: null };
  }
  if (!row.messageId?.trim()) return { status: "skip", reason: "no_message_id", handle: null };

  const handle =
    handleFromWhatsAppJid(row.peerHandle) ??
    handleFromWhatsAppJid(row.conversationId);
  if (!handle) return { status: "skip", reason: "invalid_handle", handle: null };

  const parsed = parseWhatsAppMessage(row);
  if (!parsed) return { status: "skip", reason: "empty", handle };
  return { status: "ok", record: parsed, handle };
}

export function matchWhatsAppHandle(
  rawHandle: string,
  input: {
    recruits: RecruitMatchInput[];
    contacts: Map<string, Set<string>>;
    overrides: Record<string, string>;
  },
): HandleResolution {
  return resolveHandle(rawHandle, input);
}

export function attachWhatsAppRecruit(
  parsed: WhatsAppProposedInteraction,
  match: MatchedThread,
): WhatsAppProposedInteraction {
  return { ...parsed, recruit_person_id: match.recruitId, participants: match.handle };
}

export function dedupeBySourceKey<T extends { source_key?: string }>(
  rows: T[],
): { unique: T[]; duplicateKeys: string[] } {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicateKeys: string[] = [];
  for (const row of rows) {
    const key = (row.source_key ?? "").trim();
    if (!key) continue;
    if (seen.has(key)) {
      duplicateKeys.push(key);
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return { unique, duplicateKeys };
}

export function partitionWhatsAppUpserts(
  proposed: WhatsAppProposedInteraction[],
  existingKeys: Iterable<string>,
): {
  toInsert: WhatsAppProposedInteraction[];
  alreadyExisting: WhatsAppProposedInteraction[];
  skipped: WhatsAppProposedInteraction[];
} {
  const existing = new Set([...existingKeys].map((key) => key.trim()).filter(Boolean));
  const toInsert: WhatsAppProposedInteraction[] = [];
  const alreadyExisting: WhatsAppProposedInteraction[] = [];
  const skipped: WhatsAppProposedInteraction[] = [];
  for (const row of proposed) {
    if (!row.recruit_person_id?.trim()) {
      skipped.push(row);
      continue;
    }
    if (existing.has(row.source_key)) {
      alreadyExisting.push(row);
      continue;
    }
    toInsert.push(row);
    existing.add(row.source_key);
  }
  return { toInsert, alreadyExisting, skipped };
}

/** Invert Apple Messages production gate: WhatsApp V1 may only target local/dev. */
export function assertLocalDevSupabaseUrl(url: string): void {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    throw new Error(`Invalid Supabase URL for WhatsApp helper: ${url}`);
  }
  if (isProductionSupabaseHost(host) || host.toLowerCase().endsWith(".supabase.co")) {
    throw new Error(
      `WhatsApp helper refuses production Supabase host: ${host}. V1 targets local development only.`,
    );
  }
  if (!isLocalSupabaseHost(host)) {
    throw new Error(
      `WhatsApp helper refuses non-local Supabase host: ${host}. Use 127.0.0.1 or localhost.`,
    );
  }
}

export { isLocalSupabaseHost, isProductionSupabaseHost };
