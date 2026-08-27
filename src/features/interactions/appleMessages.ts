/**
 * Pure Apple Messages → recruiting_interactions mapping.
 *
 * Matching, timestamp, body, and filter rules follow the proven read-only
 * logic in the local Messages sync script. This module never writes to
 * Messages, Contacts, Coda, or recruiting_interactions.
 */

import { APPLE_MESSAGES_SOURCE_SYSTEM } from "./appleMessageNotes";

export { APPLE_MESSAGES_SOURCE_SYSTEM };

/** Apple epoch: 2001-01-01T00:00:00Z. chat.db dates are nanoseconds since then. */
export const APPLE_EPOCH_MS = Date.UTC(2001, 0, 1);

export type HandleSource = "override" | "os" | "contacts";

export type RecruitMatchInput = {
  id: string;
  name: string;
  osHandles: string[];
};

export type MatchedThread = {
  recruitId: string;
  name: string;
  handle: string;
  source: HandleSource;
};

export type UnmatchedRecruit = {
  recruitId: string;
  name: string;
  reason: string;
};

export type AmbiguousRecruit = {
  recruitId: string;
  name: string;
  reason: string;
  handles: string[];
};

export type MatchReport = {
  matched: MatchedThread[];
  unmatched: UnmatchedRecruit[];
  ambiguous: AmbiguousRecruit[];
};

import {
  decodeAttributedBody as decodeAttributedBodyArchive,
  extractAppleMessageBody,
  messageBody as extractedMessageBody,
} from "./appleMessageBody";

export { extractAppleMessageBody } from "./appleMessageBody";
export { isPlaceholderNotes, interactionNotesPresentation } from "./appleMessageNotes";

export type AppleMessageRow = {
  guid: string | null;
  chatIdentifier: string;
  isFromMe: number | boolean | bigint;
  date: number | bigint | string;
  text: string | null;
  attributedBody?: unknown;
  associatedMessageType?: number | bigint | null;
  serviceName?: string | null;
  hasAttachments?: boolean;
};

export type ProposedInteraction = {
  recruit_person_id: string;
  tournament_id: null;
  occurred_at: string;
  interaction_type: "text";
  channel: string | null;
  direction: "inbound" | "outbound";
  participants: string;
  notes: string;
  next_steps: null;
  logged_by: null;
  source_system: typeof APPLE_MESSAGES_SOURCE_SYSTEM;
  source_key: string;
};

/**
 * Normalize to E.164 or a lowercased email. Returns null when the value
 * cannot be trusted — never guess a country-code split for matching.
 */
export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (value.includes("@")) return value.toLowerCase();

  const hadPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  if (hadPlus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** True when a raw phone would require guessing a country-code boundary. */
export function isGuessedCountryCode(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const value = String(raw).trim();
  if (value.includes("@") || value.startsWith("+")) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length > 11;
}

export function appleTimestampToIso(raw: number | bigint | string): string {
  const nanos = typeof raw === "bigint" ? raw : BigInt(raw);
  const millisSinceAppleEpoch = nanos / BigInt(1_000_000);
  return new Date(Number(millisSinceAppleEpoch) + APPLE_EPOCH_MS).toISOString();
}

export function directionFromApple(isFromMe: number | boolean | bigint): "inbound" | "outbound" {
  return isFromMe === true || Number(isFromMe) === 1 ? "outbound" : "inbound";
}

export function isGroupChat(chatIdentifier: string): boolean {
  return chatIdentifier.trim().toLowerCase().startsWith("chat");
}

export function isTapback(associatedMessageType: number | bigint | null | undefined): boolean {
  return Number(associatedMessageType ?? 0) !== 0;
}

export function decodeAttributedBody(buf: unknown): string | null {
  return decodeAttributedBodyArchive(buf);
}

export function messageBody(text: string | null | undefined, attributedBody?: unknown): string | null {
  return extractedMessageBody(text, attributedBody);
}

export function isEmptyMessage(body: string | null): boolean {
  return !body || !body.trim();
}

export function contactHandlesFor(name: string, contacts: Map<string, Set<string>>): string[] {
  const target = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (target.length === 0) return [];
  const surname = target[target.length - 1]!;
  const given = target[0]!;

  const found = new Set<string>();
  for (const [full, handles] of contacts) {
    const parts = full.replace(/\(.*?\)/g, " ").split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    if (parts[parts.length - 1] !== surname) continue;
    if (!parts.some((part) => part === given || part.startsWith(given) || given.startsWith(part))) {
      continue;
    }
    handles.forEach((handle) => found.add(handle));
  }
  return [...found];
}

export function channelFromService(serviceName: string | null | undefined): string | null {
  const value = serviceName?.trim();
  if (!value) return null;
  if (/imessage/i.test(value)) return "iMessage";
  if (/^sms$/i.test(value)) return "SMS";
  return value;
}

export function parseAppleMessage(row: AppleMessageRow): ProposedInteraction | null {
  if (isGroupChat(row.chatIdentifier)) return null;
  if (isTapback(row.associatedMessageType)) return null;
  const guid = row.guid?.trim() || null;
  if (!guid) return null;
  const handle = normalizeHandle(row.chatIdentifier);
  if (!handle) return null;
  const extracted = extractAppleMessageBody({
    text: row.text,
    attributedBody: row.attributedBody,
    hasAttachments: row.hasAttachments,
  });
  if (extracted.status !== "ok") return null;
  const notes = extracted.body;
  return {
    recruit_person_id: "",
    tournament_id: null,
    occurred_at: appleTimestampToIso(row.date),
    interaction_type: "text",
    channel: channelFromService(row.serviceName),
    direction: directionFromApple(row.isFromMe),
    participants: handle,
    notes,
    next_steps: null,
    logged_by: null,
    source_system: APPLE_MESSAGES_SOURCE_SYSTEM,
    source_key: guid,
  };
}

export function dedupeByGuid<T extends { source_key?: string; guid?: string }>(
  rows: T[],
): { unique: T[]; duplicateKeys: string[] } {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicateKeys: string[] = [];
  for (const row of rows) {
    const key = (row.source_key ?? row.guid ?? "").trim();
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

function uniqueOsHandles(raw: string[]): string[] {
  const handles = new Set<string>();
  for (const value of raw) {
    if (isGuessedCountryCode(value)) continue;
    const handle = normalizeHandle(value);
    if (handle) handles.add(handle);
  }
  return [...handles];
}

function overrideRawForRecruit(
  recruit: RecruitMatchInput,
  overrides: Record<string, string>,
): string | undefined {
  return overrides[recruit.id] ?? overrides[recruit.name];
}

export function parsePersonName(name: string): { given: string; surname: string } | null {
  const parts = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return null;
  return { given: parts[0]!, surname: parts[parts.length - 1]! };
}

/** Conservative given+surname identity. Surname alone never matches. */
export function namesConservativelyMatch(contactName: string, recruitName: string): boolean {
  const contact = parsePersonName(contactName);
  const recruit = parsePersonName(recruitName);
  if (!contact || !recruit) return false;
  if (contact.surname !== recruit.surname) return false;
  return (
    contact.given === recruit.given ||
    contact.given.startsWith(recruit.given) ||
    recruit.given.startsWith(contact.given)
  );
}

export function contactNamesForHandle(
  handle: string,
  contacts: Map<string, Set<string>>,
): string[] {
  const normalized = normalizeHandle(handle);
  if (!normalized) return [];
  const names: string[] = [];
  for (const [name, handles] of contacts) {
    if ([...handles].some((value) => normalizeHandle(value) === normalized)) names.push(name);
  }
  return names;
}

export type HandleResolution =
  | { status: "matched"; match: MatchedThread }
  | { status: "ambiguous" }
  | { status: "unmatched" };

function uniqueRecruit(rows: RecruitMatchInput[]): RecruitMatchInput | "ambiguous" | null {
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size === 0) return null;
  if (ids.size > 1) return "ambiguous";
  return rows[0] ?? null;
}

/**
 * Handle-first conservative resolver used by the dry-run importer and the
 * live helper. Never surname-only; never first-candidate on ties.
 */
export function resolveHandle(
  rawHandle: string,
  input: {
    recruits: RecruitMatchInput[];
    contacts: Map<string, Set<string>>;
    overrides: Record<string, string>;
  },
): HandleResolution {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return { status: "unmatched" };

  const overrideHits: RecruitMatchInput[] = [];
  const skippedByOverride = new Set<string>();
  for (const recruit of input.recruits) {
    const raw = overrideRawForRecruit(recruit, input.overrides);
    if (raw === undefined) continue;
    skippedByOverride.add(recruit.id);
    const mapped = normalizeHandle(raw);
    if (mapped === handle) overrideHits.push(recruit);
  }
  if (overrideHits.length === 1) {
    const recruit = overrideHits[0]!;
    return {
      status: "matched",
      match: { recruitId: recruit.id, name: recruit.name, handle, source: "override" },
    };
  }
  if (overrideHits.length > 1) return { status: "ambiguous" };

  const osHits = input.recruits.filter((recruit) => {
    if (skippedByOverride.has(recruit.id)) return false;
    return uniqueOsHandles(recruit.osHandles).includes(handle);
  });
  const osUnique = uniqueRecruit(osHits);
  if (osUnique === "ambiguous") return { status: "ambiguous" };
  if (osUnique) {
    return {
      status: "matched",
      match: { recruitId: osUnique.id, name: osUnique.name, handle, source: "os" },
    };
  }

  const contactNames = contactNamesForHandle(handle, input.contacts);
  const contactHits: RecruitMatchInput[] = [];
  for (const recruit of input.recruits) {
    if (skippedByOverride.has(recruit.id)) continue;
    if (contactNames.some((name) => namesConservativelyMatch(name, recruit.name))) {
      contactHits.push(recruit);
    }
  }
  const contactUnique = uniqueRecruit(contactHits);
  if (contactUnique === "ambiguous") return { status: "ambiguous" };
  if (contactUnique) {
    return {
      status: "matched",
      match: { recruitId: contactUnique.id, name: contactUnique.name, handle, source: "contacts" },
    };
  }
  return { status: "unmatched" };
}

/**
 * Conservative 1:1 matching for importer reports. Each thread handle is
 * resolved independently so a recruit may own both a phone thread and an
 * email thread. A handle that maps to more than one recruit is ambiguous.
 */
export function matchRecruitsToThreads(input: {
  recruits: RecruitMatchInput[];
  threadHandles: Iterable<string>;
  contacts: Map<string, Set<string>>;
  overrides: Record<string, string>;
}): MatchReport {
  const threads = [...new Set(
    [...input.threadHandles]
      .map((handle) => normalizeHandle(handle))
      .filter((value): value is string => Boolean(value)),
  )];

  const matched: MatchedThread[] = [];
  const unmatched: UnmatchedRecruit[] = [];
  const ambiguous: AmbiguousRecruit[] = [];
  const matchedRecruitIds = new Set<string>();
  const ambiguousRecruitIds = new Set<string>();

  for (const handle of threads) {
    const resolved = resolveHandle(handle, input);
    if (resolved.status === "matched") {
      matched.push(resolved.match);
      matchedRecruitIds.add(resolved.match.recruitId);
      continue;
    }
    if (resolved.status === "ambiguous") {
      for (const recruit of input.recruits) {
        const raw = input.overrides[recruit.id] ?? input.overrides[recruit.name];
        const osHit = uniqueOsHandles(recruit.osHandles).includes(handle);
        const contactHit = contactNamesForHandle(handle, input.contacts).some((name) =>
          namesConservativelyMatch(name, recruit.name),
        );
        const overrideHit = raw !== undefined && normalizeHandle(raw) === handle;
        if (overrideHit || osHit || contactHit) {
          ambiguousRecruitIds.add(recruit.id);
          if (!ambiguous.some((row) => row.recruitId === recruit.id && row.handles[0] === handle)) {
            ambiguous.push({
              recruitId: recruit.id,
              name: recruit.name,
              reason: "handle matches more than one recruit",
              handles: [handle],
            });
          }
        }
      }
    }
  }

  for (const recruit of input.recruits) {
    if (matchedRecruitIds.has(recruit.id) || ambiguousRecruitIds.has(recruit.id)) continue;
    const overrideRaw = input.overrides[recruit.id] ?? input.overrides[recruit.name];
    if (overrideRaw !== undefined) {
      const handle = normalizeHandle(overrideRaw);
      unmatched.push({
        recruitId: recruit.id,
        name: recruit.name,
        reason: !handle ? "override is not a valid handle" : "override handle has no 1:1 thread",
      });
      continue;
    }
    unmatched.push({
      recruitId: recruit.id,
      name: recruit.name,
      reason: "no 1:1 thread for known handles",
    });
  }

  return { matched, unmatched, ambiguous };
}

export function attachRecruit(parsed: ProposedInteraction, match: MatchedThread): ProposedInteraction {
  return { ...parsed, recruit_person_id: match.recruitId, participants: match.handle };
}

export type RecruitFilterResult =
  | { status: "all" }
  | { status: "matched"; recruit: RecruitMatchInput; query: string }
  | { status: "none"; query: string }
  | { status: "ambiguous"; query: string; matches: Array<{ id: string; name: string }> };

export type MessageSkipReason = "group" | "tapback" | "empty" | "decode_failed" | "no_guid" | "invalid_handle";

export type ClassifiedMessage =
  | { status: "ok"; record: ProposedInteraction; handle: string }
  | { status: "skip"; reason: MessageSkipReason; handle: string | null };

export type MessageScanSummary = {
  inbound: number;
  outbound: number;
  emptyOrFailedDecodes: number;
  tapbacksExcluded: number;
  dateRange: { earliest: string; latest: string } | null;
};

function normalizePersonName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseRecruitFlag(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--recruit" || arg === "--recruit-id") {
      const value = argv[i + 1]?.trim() ?? "";
      if (!value || value.startsWith("--")) {
        throw new Error("Provide a recruit name or recruit ID after --recruit.");
      }
      return value;
    }
    if (arg.startsWith("--recruit=")) {
      const value = arg.slice("--recruit=".length).trim();
      if (!value) throw new Error("Provide a recruit name or recruit ID after --recruit.");
      return value;
    }
  }
  return null;
}

export function resolveRecruitFilter(
  recruits: RecruitMatchInput[],
  query: string | null | undefined,
): RecruitFilterResult {
  const trimmed = query?.trim() ?? "";
  if (!trimmed) return { status: "all" };

  const idMatches = recruits.filter((recruit) => recruit.id === trimmed);
  if (idMatches.length === 1) return { status: "matched", recruit: idMatches[0]!, query: trimmed };
  if (idMatches.length > 1) {
    return {
      status: "ambiguous",
      query: trimmed,
      matches: idMatches.map((recruit) => ({ id: recruit.id, name: recruit.name })),
    };
  }

  const needle = normalizePersonName(trimmed);
  const exactName = recruits.filter((recruit) => normalizePersonName(recruit.name) === needle);
  if (exactName.length === 1) return { status: "matched", recruit: exactName[0]!, query: trimmed };
  if (exactName.length > 1) {
    return {
      status: "ambiguous",
      query: trimmed,
      matches: exactName.map((recruit) => ({ id: recruit.id, name: recruit.name })),
    };
  }

  const partial = recruits.filter((recruit) => {
    const name = normalizePersonName(recruit.name);
    if (name.includes(needle)) return true;
    return name.split(" ").some((part) => part.startsWith(needle));
  });
  if (partial.length === 1) return { status: "matched", recruit: partial[0]!, query: trimmed };
  if (partial.length > 1) {
    return {
      status: "ambiguous",
      query: trimmed,
      matches: partial.map((recruit) => ({ id: recruit.id, name: recruit.name })),
    };
  }
  return { status: "none", query: trimmed };
}

export function recruitFilterError(result: Extract<RecruitFilterResult, { status: "none" } | { status: "ambiguous" }>): string {
  if (result.status === "none") return `No recruit matches "${result.query}".`;
  const names = result.matches.map((row) => `${row.name} (${row.id})`).join(", ");
  return `Recruit filter "${result.query}" is ambiguous; matches: ${names}. Use the full name or recruit ID.`;
}

export function candidateHandlesForRecruit(
  recruit: RecruitMatchInput,
  contacts: Map<string, Set<string>>,
  overrides: Record<string, string>,
): string[] {
  const handles = new Set<string>();
  const overrideRaw = overrides[recruit.id] ?? overrides[recruit.name];
  const override = normalizeHandle(overrideRaw);
  if (override) handles.add(override);
  for (const value of recruit.osHandles) {
    if (isGuessedCountryCode(value)) continue;
    const handle = normalizeHandle(value);
    if (handle) handles.add(handle);
  }
  for (const handle of contactHandlesFor(recruit.name, contacts)) handles.add(handle);
  return [...handles];
}

export function classifyAppleMessage(row: AppleMessageRow): ClassifiedMessage {
  const handle = normalizeHandle(row.chatIdentifier);
  if (isGroupChat(row.chatIdentifier)) return { status: "skip", reason: "group", handle };
  if (isTapback(row.associatedMessageType)) return { status: "skip", reason: "tapback", handle };
  if (!row.guid?.trim()) return { status: "skip", reason: "no_guid", handle };
  if (!handle) return { status: "skip", reason: "invalid_handle", handle: null };
  const extracted = extractAppleMessageBody({
    text: row.text,
    attributedBody: row.attributedBody,
    hasAttachments: row.hasAttachments,
  });
  if (extracted.status === "decode_failed") return { status: "skip", reason: "decode_failed", handle };
  const parsed = parseAppleMessage(row);
  if (!parsed) return { status: "skip", reason: "empty", handle };
  return { status: "ok", record: parsed, handle };
}

export function summarizeMessageScan(
  classified: ClassifiedMessage[],
  proposed: ProposedInteraction[],
): MessageScanSummary {
  let inbound = 0;
  let outbound = 0;
  for (const row of proposed) {
    if (row.direction === "inbound") inbound += 1;
    else outbound += 1;
  }
  let emptyOrFailedDecodes = 0;
  let tapbacksExcluded = 0;
  for (const row of classified) {
    if (row.status !== "skip") continue;
    if (row.reason === "empty" || row.reason === "decode_failed") emptyOrFailedDecodes += 1;
    if (row.reason === "tapback") tapbacksExcluded += 1;
  }
  const dates = proposed.map((row) => row.occurred_at).filter(Boolean).sort();
  return {
    inbound,
    outbound,
    emptyOrFailedDecodes,
    tapbacksExcluded,
    dateRange: dates.length ? { earliest: dates[0]!, latest: dates[dates.length - 1]! } : null,
  };
}

export function reportFileSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "recruit";
}

export const LOCAL_APPLY_FLAG = "--apply-local";
export const LOCAL_CONFIRM_FLAG = "--confirm-local-import";

export function hasForbiddenWriteFlags(argv: string[]): boolean {
  return argv.includes("--apply") || argv.includes("--write");
}

export function hasLocalApplyFlag(argv: string[]): boolean {
  return argv.includes(LOCAL_APPLY_FLAG);
}

export function hasLocalConfirmFlag(argv: string[]): boolean {
  return argv.includes(LOCAL_CONFIRM_FLAG);
}

export function isLocalSupabaseHost(host: string): boolean {
  const hostname = host.trim().toLowerCase().replace(/^\[/, "").replace(/\]:\d+$/, "").replace(/:\d+$/, "");
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export function isExactRecruitQuery(recruit: { id: string; name: string }, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (recruit.id === trimmed) return true;
  return normalizePersonName(recruit.name) === normalizePersonName(trimmed);
}

export function forbiddenWriteError(): string {
  return "Refusing --apply/--write. Apple Messages writes only accept --apply-local on 127.0.0.1 or localhost.";
}

export function assertLocalApplyEnvironment(input: { host: string; recruitQuery: string | null }): void {
  if (!isLocalSupabaseHost(input.host)) {
    throw new Error(
      `Refusing --apply-local: Supabase host "${input.host}" is not 127.0.0.1 or localhost.`,
    );
  }
  if (!input.recruitQuery?.trim()) {
    throw new Error("--apply-local requires an exact --recruit name or recruit ID.");
  }
}

export function assertLocalApplyReady(input: {
  recruitQuery: string;
  filter: RecruitFilterResult;
  proposedCount: number;
  confirmed: boolean;
}): void {
  if (input.filter.status === "all") {
    throw new Error("--apply-local refuses unfiltered bulk writes. Pass --recruit with an exact name or recruit ID.");
  }
  if (input.filter.status === "none" || input.filter.status === "ambiguous") {
    throw new Error(recruitFilterError(input.filter));
  }
  if (!isExactRecruitQuery(input.filter.recruit, input.recruitQuery)) {
    throw new Error(
      `--apply-local requires the exact recruit name or recruit ID. "${input.recruitQuery}" is not an exact match for ${input.filter.recruit.name}.`,
    );
  }
  if (!input.confirmed) {
    throw new Error(
      `Refusing --apply-local without --confirm-local-import. Proposed recruiting_interactions: ${input.proposedCount}. Re-run with --confirm-local-import to write to local recruiting_interactions.`,
    );
  }
}

export function toRecruitingInteractionInsert(row: ProposedInteraction): ProposedInteraction {
  return {
    recruit_person_id: row.recruit_person_id,
    tournament_id: null,
    occurred_at: row.occurred_at,
    interaction_type: "text",
    channel: row.channel,
    direction: row.direction,
    participants: row.participants,
    notes: row.notes,
    next_steps: null,
    logged_by: null,
    source_system: APPLE_MESSAGES_SOURCE_SYSTEM,
    source_key: row.source_key,
  };
}

export function partitionLocalUpserts(
  proposed: ProposedInteraction[],
  existingKeys: Iterable<string>,
): {
  toInsert: ProposedInteraction[];
  alreadyExisting: ProposedInteraction[];
  skipped: ProposedInteraction[];
} {
  const existing = new Set([...existingKeys].map((key) => key.trim()).filter(Boolean));
  const toInsert: ProposedInteraction[] = [];
  const alreadyExisting: ProposedInteraction[] = [];
  const skipped: ProposedInteraction[] = [];
  for (const row of proposed) {
    const mapped = toRecruitingInteractionInsert(row);
    if (!mapped.recruit_person_id.trim() || !mapped.source_key.trim()) {
      skipped.push(mapped);
      continue;
    }
    if (existing.has(mapped.source_key)) {
      alreadyExisting.push(mapped);
      continue;
    }
    toInsert.push(mapped);
    existing.add(mapped.source_key);
  }
  return { toInsert, alreadyExisting, skipped };
}

export const PRODUCTION_DRY_RUN_FLAG = "--production-dry-run";
export const PRODUCTION_ENV_FILE = ".env.production.local";

export function hasProductionDryRunFlag(argv: string[]): boolean {
  return argv.includes(PRODUCTION_DRY_RUN_FLAG);
}

export function isProductionSupabaseHost(host: string): boolean {
  if (isLocalSupabaseHost(host)) return false;
  const hostname = host.trim().toLowerCase().replace(/^\[/, "").replace(/\]:\d+$/, "").replace(/:\d+$/, "");
  return hostname.endsWith(".supabase.co");
}

export function parseDotEnv(contents: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function productionCredentialsFromEnv(env: Record<string, string | undefined>): {
  url: string;
  key: string;
  host: string;
} {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_SECRET_KEY ??
    env.SECRET_KEY
  )?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing from .env.production.local.");
  }
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing from .env.production.local.");
  }
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL in .env.production.local is not a valid URL.");
  }
  if (!isProductionSupabaseHost(host)) {
    throw new Error(
      `Refusing --production-dry-run: host "${host}" is not the hosted production Supabase host.`,
    );
  }
  return { url, key, host };
}

export function assertProductionDryRunEnvironment(input: {
  host: string;
  recruitQuery: string | null;
  applyLocal: boolean;
}): void {
  if (input.applyLocal) {
    throw new Error("Refusing to combine --production-dry-run with --apply-local.");
  }
  if (isLocalSupabaseHost(input.host) || !isProductionSupabaseHost(input.host)) {
    throw new Error(
      `Refusing --production-dry-run: host "${input.host}" is not the hosted production Supabase host.`,
    );
  }
  if (!input.recruitQuery?.trim()) {
    throw new Error("--production-dry-run requires an exact --recruit name or recruit ID.");
  }
}

export function assertProductionDryRunReady(input: {
  recruitQuery: string;
  filter: RecruitFilterResult;
}): void {
  if (input.filter.status === "all") {
    throw new Error(
      "--production-dry-run refuses unfiltered bulk reads. Pass --recruit with an exact name or recruit ID.",
    );
  }
  if (input.filter.status === "none" || input.filter.status === "ambiguous") {
    throw new Error(recruitFilterError(input.filter));
  }
  if (!isExactRecruitQuery(input.filter.recruit, input.recruitQuery)) {
    throw new Error(
      `--production-dry-run requires the exact recruit name or recruit ID. "${input.recruitQuery}" is not an exact match for ${input.filter.recruit.name}.`,
    );
  }
}

export function compareProposedGuids(
  proposed: ProposedInteraction[],
  existingKeys: Iterable<string>,
): {
  newCount: number;
  alreadyPresentCount: number;
  skippedCount: number;
  newSourceKeys: string[];
  alreadyPresentSourceKeys: string[];
} {
  const partitioned = partitionLocalUpserts(proposed, existingKeys);
  return {
    newCount: partitioned.toInsert.length,
    alreadyPresentCount: partitioned.alreadyExisting.length,
    skippedCount: partitioned.skipped.length,
    newSourceKeys: partitioned.toInsert.map((row) => row.source_key),
    alreadyPresentSourceKeys: partitioned.alreadyExisting.map((row) => row.source_key),
  };
}

export function productionReportSlug(name: string): string {
  return `apple-messages-production-dry-run-${reportFileSlug(name)}`;
}
