/**
 * Parse + validate raw editor input into typed domain values (BP-037 / BP-037A).
 *
 * Empty / whitespace clears optional fields as `null` (wire-safe clear for
 * Server Actions + Supabase). Required fields reject empty.
 */

import type { FieldDefinition, FieldParseResult } from "./types";

function emptyToNull(trimmed: string): string | null {
  return trimmed === "" ? null : trimmed;
}

export function parseFieldValue(def: FieldDefinition, raw: string): FieldParseResult {
  const trimmed = raw.trim();

  if (trimmed === "") {
    if (def.required) {
      return { ok: false, error: `${def.label} is required.` };
    }
    // Canonical clear — must be null, not undefined (BP-037A).
    return { ok: true, value: null };
  }

  if (def.maxLength !== undefined && trimmed.length > def.maxLength) {
    return {
      ok: false,
      error:
        def.maxLength === 1
          ? `${def.label} must be 1 character.`
          : `${def.label} must be ${def.maxLength} characters or fewer.`,
    };
  }

  switch (def.type) {
    case "number":
    case "currency":
    case "percentage": {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        return { ok: false, error: `${def.label} must be a number.` };
      }
      return { ok: true, value: n };
    }
    case "boolean": {
      if (trimmed === "true" || trimmed === "yes") return { ok: true, value: true };
      if (trimmed === "false" || trimmed === "no") return { ok: true, value: false };
      return { ok: false, error: `${def.label} must be Yes or No.` };
    }
    case "enum": {
      const allowed = def.enumValues?.map((option) => option.value) ?? [];
      if (!allowed.includes(trimmed)) {
        return { ok: false, error: `${def.label} is not a valid option.` };
      }
      return { ok: true, value: trimmed };
    }
    case "date":
    case "text":
    case "longText":
    case "secureText":
    case "phone":
    case "email":
    case "url":
    case "relationship":
      return { ok: true, value: emptyToNull(trimmed) };
    case "attachment":
    case "json":
    case "system":
      return { ok: false, error: `${def.label} cannot be edited here.` };
    default:
      return { ok: true, value: emptyToNull(trimmed) };
  }
}
