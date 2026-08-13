/**
 * Person search helpers (BP-038B).
 *
 * Directory and palette search consume Field Catalog `searchable` metadata.
 * They do not maintain parallel field lists.
 */

import {
  getSearchablePersonFields,
  type PersonFieldDefinition,
} from "./fieldCatalog";
import type { Person } from "./types";

function isLookupRef(value: unknown): value is { key: string; label: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    "label" in value &&
    typeof (value as { key: unknown }).key === "string" &&
    typeof (value as { label: unknown }).label === "string"
  );
}

/** Search token for Denison ID (matches directory display form without importing utils). */
function denisonIdSearchText(denisonId: string): string {
  const trimmed = denisonId.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/^D#?/i, "");
  const display = digits ? `D#${digits}` : "";
  return [display, trimmed].filter(Boolean).join(" ");
}

/** Flatten one catalog field's value into searchable text tokens. */
export function personFieldSearchText(
  person: Person,
  field: PersonFieldDefinition,
): string {
  const value = person[field.key];
  if (value === undefined || value === null || value === "") return "";

  if (isLookupRef(value)) {
    return [value.key, value.label].filter(Boolean).join(" ");
  }

  if (typeof value === "object") return "";

  const asString = String(value);

  if (field.key === "denisonId") {
    return denisonIdSearchText(asString);
  }

  if (field.enumValues?.length) {
    const option = field.enumValues.find((entry) => entry.value === asString);
    return option ? `${asString} ${option.label}` : asString;
  }

  return asString;
}

/** All searchable-field tokens for a person (catalog-driven). */
export function personSearchTokens(person: Person): string[] {
  const tokens: string[] = [];
  for (const field of getSearchablePersonFields()) {
    const text = personFieldSearchText(person, field).trim();
    if (text) tokens.push(text);
  }
  return tokens;
}

/**
 * Team directory / faceted search — matches against catalog `searchable` fields.
 */
export function matchesSearch(person: Person, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = personSearchTokens(person).join(" ").toLowerCase();
  return haystack.includes(q);
}

/**
 * Command-palette keyword bag: searchable catalog fields plus presentation
 * helpers (display name, initials, hometown) that are not Person columns.
 */
export function personPaletteKeywords(
  person: Person,
  presentation: readonly string[],
): string[] {
  return [...presentation, ...personSearchTokens(person)].filter(Boolean);
}
