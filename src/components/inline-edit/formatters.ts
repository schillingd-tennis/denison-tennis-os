/**
 * Smart field formatters for the Universal Inline Editing Framework (BP-019).
 *
 * Pure helpers with no React / Person / module knowledge — call them from
 * any cell `onCommit` (or workspace save path) before persisting.
 */

/** Trim + lowercase. Empty / whitespace-only → `undefined`. */
export function normalizeEmail(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed.toLowerCase();
}

/**
 * Normalize a phone number for storage + display.
 *
 * US 10-digit numbers (and 11-digit numbers starting with `1`) become
 * `(614) 555-1212`. Other valid digit lengths (10–15) are stored as digits
 * only. Blank input → `undefined`.
 */
export function normalizePhone(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return undefined;

  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (national.length === 10) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }

  return digits;
}

/** Display helper — same rules as `normalizePhone` (safe to call on already-normalized values). */
export function formatPhoneDisplay(value: string | undefined): string | undefined {
  return normalizePhone(value);
}

/** Digits-only phone for `tel:` / `sms:` hrefs. Blank / no digits → `undefined`. */
export function phoneHrefDigits(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : undefined;
}

/**
 * Ensure a URL has a scheme. Bare hosts like `example.com` become
 * `https://example.com`. Values that already include a scheme are left
 * intact. Blank → `undefined`.
 *
 * No URL fields use this yet — exported so future modules can opt in
 * without re-implementing the rule.
 */
export function normalizeUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  // Already has a scheme (http:, https:, mailto:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
