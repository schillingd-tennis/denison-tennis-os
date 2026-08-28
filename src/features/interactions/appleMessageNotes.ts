export const DIRECTION_PLACEHOLDERS = new Set(["inbound", "outbound"]);

export const APPLE_MESSAGES_SOURCE_SYSTEM = "apple_messages";

/** Substrings that indicate keyed-archive / attributed-string serialization, not message text. */
export const SERIALIZATION_MARKERS = [
  "NSAttributedString",
  "NSObject",
  "NSString",
  "NSDictionary",
  "NSKeyedArchiver",
  "NSMutableAttributedString",
  "NSMutableString",
  "NSArchiver",
  "streamtyped",
  "bplist00",
] as const;

const GENERIC_PLACEHOLDERS = new Set(["inbound", "outbound", "text", "message", "null", "undefined"]);
const CLASS_NAME = /^NS[A-Z][A-Za-z0-9]+$/;

export function containsSerializationMarkers(value: string): boolean {
  return SERIALIZATION_MARKERS.some((marker) => value.includes(marker));
}

export function hasExcessiveReplacementChars(value: string): boolean {
  const count = [...value].filter((ch) => ch === "\uFFFD").length;
  if (count === 0) return false;
  if (value.length <= 24) return true;
  return count / value.length > 0.02;
}

export function normalizeAppleMessageBody(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** True when notes look like serialized archive bytes, not a human message. */
export function isCorruptedNotes(notes: string | null | undefined): boolean {
  const value = notes?.trim() ?? "";
  if (!value) return false;
  if (isPlaceholderNotes(notes)) return false;
  return containsSerializationMarkers(value) || hasExcessiveReplacementChars(value);
}

export function isDirectionPlaceholderNotes(notes: string | null | undefined): boolean {
  const value = notes?.trim().toLowerCase() ?? "";
  return value.length === 0 ? false : DIRECTION_PLACEHOLDERS.has(value);
}

export function isPlaceholderNotes(notes: string | null | undefined): boolean {
  const value = notes?.trim() ?? "";
  return value === "" || DIRECTION_PLACEHOLDERS.has(value.toLowerCase());
}

/** Confident human-readable message body — rejects archive noise and direction placeholders. */
export function isReadableAppleMessageBody(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = normalizeAppleMessageBody(value);
  if (trimmed.length < 1) return false;
  if (GENERIC_PLACEHOLDERS.has(trimmed.toLowerCase())) return false;
  if (CLASS_NAME.test(trimmed)) return false;
  if (containsSerializationMarkers(trimmed)) return false;
  if (hasExcessiveReplacementChars(trimmed)) return false;
  if (trimmed.length <= 3 && !/[\p{L}\p{N}]/u.test(trimmed)) return false;
  return true;
}

export function interactionNotesPresentation(input: {
  notes: string | null;
  sourceSystem?: string | null;
}): { kind: "notes" | "unavailable" | "none"; text: string | null } {
  if (isDirectionPlaceholderNotes(input.notes)) return { kind: "unavailable", text: null };
  if (input.sourceSystem === APPLE_MESSAGES_SOURCE_SYSTEM && isPlaceholderNotes(input.notes)) {
    return { kind: "unavailable", text: null };
  }
  if (input.sourceSystem === APPLE_MESSAGES_SOURCE_SYSTEM && isCorruptedNotes(input.notes)) {
    return { kind: "unavailable", text: null };
  }
  if (input.notes?.trim()) return { kind: "notes", text: input.notes };
  return { kind: "none", text: null };
}
