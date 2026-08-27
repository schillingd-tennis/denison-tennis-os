import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { DIRECTION_PLACEHOLDERS } from "./appleMessageNotes";

export { isDirectionPlaceholderNotes, isPlaceholderNotes, interactionNotesPresentation } from "./appleMessageNotes";

const GENERIC_PLACEHOLDERS = new Set(["inbound", "outbound", "text", "message", "null", "undefined"]);
const CLASS_NAME = /^NS[A-Z][A-Za-z0-9]+$/;

function swiftDecoderPath(): string {
  return join(process.cwd(), "helpers/apple-messages-decode/DecodeAttributedBody.swift");
}

export type AppleMessageBodySource = "text" | "attributed_body" | "attachment";

export type AppleMessageBodyResult =
  | { status: "ok"; body: string; source: AppleMessageBodySource }
  | { status: "decode_failed" }
  | { status: "empty" };

export function blobFromUnknown(value: unknown): Buffer | null {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value.length > 0 ? value : null;
  if (value instanceof Uint8Array) return value.length > 0 ? Buffer.from(value) : null;
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return value.length > 0 ? Buffer.from(value) : null;
  }
  if (typeof value === "object" && value && "data" in value && Array.isArray((value as { data: unknown }).data)) {
    return blobFromUnknown((value as { data: number[] }).data);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0 && trimmed.length >= 8) {
      return Buffer.from(trimmed, "hex");
    }
    return Buffer.from(value, "latin1");
  }
  return null;
}

function isMostlyText(bytes: Buffer): boolean {
  if (bytes.length === 0) return false;
  let textish = 0;
  for (const byte of bytes) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte !== 127)) textish += 1;
  }
  return textish / bytes.length >= 0.85;
}

function normalizeExtractedBody(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function isMeaningfulBody(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = normalizeExtractedBody(value);
  if (trimmed.length < 1) return false;
  if (GENERIC_PLACEHOLDERS.has(trimmed.toLowerCase())) return false;
  if (CLASS_NAME.test(trimmed)) return false;
  if (trimmed.length <= 3 && !/[\p{L}\p{N}]/u.test(trimmed)) return false;
  return true;
}

function readLengthPrefixed(bytes: Buffer, index: number): { text: string; next: number } | null {
  if (index >= bytes.length) return null;
  const lead = bytes[index]!;
  let length = 0;
  let dataAt = index + 1;
  if (lead < 128) {
    length = lead;
  } else if (lead === 0x81 && index + 2 <= bytes.length) {
    length = bytes[index + 1]!;
    dataAt = index + 2;
  } else if (lead === 0x82 && index + 3 <= bytes.length) {
    length = (bytes[index + 1]! << 8) | bytes[index + 2]!;
    dataAt = index + 3;
  } else {
    return null;
  }
  if (length < 1 || length > 16_384 || dataAt + length > bytes.length) return null;
  const slice = bytes.subarray(dataAt, dataAt + length);
  if (!isMostlyText(slice)) return null;
  const text = normalizeExtractedBody(slice.toString("utf8"));
  return isMeaningfulBody(text) ? { text, next: dataAt + length } : null;
}

function candidatesFromAttributedBody(bytes: Buffer): string[] {
  const found: string[] = [];
  const marker = bytes.indexOf("NSString");
  if (marker !== -1) {
    let i = marker + 8;
    while (i < bytes.length && bytes[i]! < 32) i += 1;
    if (i < bytes.length && bytes[i] === 0x2b) i += 1;
    const prefixed = readLengthPrefixed(bytes, i);
    if (prefixed) found.push(prefixed.text);
    else {
      const rest = bytes.subarray(i);
      let end = 0;
      while (end < rest.length) {
        const c = rest[end]!;
        if (c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) break;
        end += 1;
      }
      const extracted = normalizeExtractedBody(rest.subarray(0, end).toString("utf8"));
      if (isMeaningfulBody(extracted)) found.push(extracted);
    }
  }

  for (let i = 0; i < bytes.length - 3; i += 1) {
    if (bytes[i] === 0x01 && bytes[i + 1] === 0x2b) {
      let end = i + 2;
      while (end < bytes.length) {
        const c = bytes[end]!;
        if (c === 0 || c === 0x86 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) break;
        end += 1;
      }
      const extracted = normalizeExtractedBody(bytes.subarray(i + 2, end).toString("utf8"));
      if (isMeaningfulBody(extracted)) found.push(extracted);
    }
    if (bytes[i] === 0x01) {
      const prefixed = readLengthPrefixed(bytes, i + 1);
      if (prefixed) found.push(prefixed.text);
    }
  }

  return found;
}

function looksLikeArchive(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  if (bytes.subarray(0, 8).toString("ascii") === "bplist00") return true;
  if (bytes.indexOf("streamtyped") === 0 || bytes.indexOf("streamtyped") !== -1) return true;
  return bytes.indexOf("NSKeyedArchiver") !== -1 || bytes.indexOf("NSAttributedString") !== -1;
}

function decodeWithFoundation(bytes: Buffer): string | null {
  if (process.env.APPLE_MESSAGES_DISABLE_NATIVE_DECODER === "1") return null;
  const decoder = swiftDecoderPath();
  if (!existsSync(decoder) || !existsSync("/usr/bin/swift")) return null;
  if (!looksLikeArchive(bytes)) return null;
  const result = spawnSync("/usr/bin/swift", [decoder], {
    input: bytes,
    timeout: 4000,
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0 || !result.stdout) return null;
  const extracted = normalizeExtractedBody(Buffer.from(result.stdout).toString("utf8"));
  return isMeaningfulBody(extracted) ? extracted : null;
}

export function decodeAttributedBody(buf: unknown): string | null {
  const bytes = blobFromUnknown(buf);
  if (!bytes) return null;
  const candidates = candidatesFromAttributedBody(bytes);
  const best = candidates.sort((a, b) => b.length - a.length)[0] ?? null;
  if (isMeaningfulBody(best)) return best;
  return decodeWithFoundation(bytes);
}

export function extractAppleMessageBody(input: {
  text?: string | null;
  attributedBody?: unknown;
  hasAttachments?: boolean;
}): AppleMessageBodyResult {
  const direct = input.text?.trim() ?? "";
  if (isMeaningfulBody(direct) && !DIRECTION_PLACEHOLDERS.has(direct.toLowerCase())) {
    return { status: "ok", body: normalizeExtractedBody(direct), source: "text" };
  }
  const decoded = decodeAttributedBody(input.attributedBody);
  if (decoded) return { status: "ok", body: decoded, source: "attributed_body" };
  if (input.hasAttachments) return { status: "ok", body: "Attachment", source: "attachment" };
  if (blobFromUnknown(input.attributedBody)) return { status: "decode_failed" };
  if (direct && DIRECTION_PLACEHOLDERS.has(direct.toLowerCase())) return { status: "decode_failed" };
  return { status: "empty" };
}

export function messageBody(text: string | null | undefined, attributedBody?: unknown): string | null {
  const result = extractAppleMessageBody({ text, attributedBody });
  return result.status === "ok" ? result.body : null;
}
