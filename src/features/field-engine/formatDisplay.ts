/**
 * Type-aware display formatting for the Universal Field Engine (BP-037).
 *
 * Presentation only — persistence keeps raw values.
 */

import { EMPTY_VALUE, formatDate, formatDisplay, formatPercent } from "@/lib/formatting";

import type { FieldDefinition } from "./types";

/** Mask SSN for display; empty → EMPTY_VALUE. Shows last four digits when present. */
export function maskSocialSecurityNumber(value: string | undefined): string {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return EMPTY_VALUE;
  if (digits.length < 4) return "•••-••-••••";
  return `•••-••-${digits.slice(-4)}`;
}

/** Mask passport number at rest (reveal last four). */
export function maskPassportNumber(value: string | undefined): string {
  const trimmed = value?.replace(/\s+/g, "") ?? "";
  if (!trimmed) return EMPTY_VALUE;
  if (trimmed.length < 4) return "••••";
  return `${"•".repeat(Math.min(8, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function maskSecureGeneric(value: string | undefined): string {
  const trimmed = value?.replace(/\s+/g, "") ?? "";
  if (!trimmed) return EMPTY_VALUE;
  if (trimmed.length < 4) return "••••";
  return `${"•".repeat(Math.min(8, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function formatEnum(def: FieldDefinition, value: unknown): string {
  if (value === undefined || value === null || value === "") return EMPTY_VALUE;
  const asString = String(value);
  return def.enumValues?.find((option) => option.value === asString)?.label ?? EMPTY_VALUE;
}

function formatBoolean(value: unknown): string {
  if (value === undefined || value === null || value === "") return EMPTY_VALUE;
  if (value === true || value === "true") return "Yes";
  if (value === false || value === "false") return "No";
  return EMPTY_VALUE;
}

/**
 * Format a field value for at-rest display (never shows raw sensitive text).
 */
export function formatFieldDisplay(def: FieldDefinition, value: unknown): string {
  if (def.type === "secureText" || def.sensitive) {
    const asString = typeof value === "string" ? value : value == null ? undefined : String(value);
    if (def.key === "socialSecurityNumber") return maskSocialSecurityNumber(asString);
    if (def.key === "passportNumber") return maskPassportNumber(asString);
    return maskSecureGeneric(asString);
  }

  switch (def.type) {
    case "date":
      return formatDate(typeof value === "string" ? value : undefined);
    case "enum":
      return formatEnum(def, value);
    case "boolean":
      return formatBoolean(value);
    case "percentage":
      return typeof value === "number" ? formatPercent(value) : formatDisplay(value as string | undefined);
    case "number":
    case "currency":
      return formatDisplay(
        value === undefined || value === null || value === "" ? undefined : String(value),
      );
    case "longText":
    case "text":
    case "phone":
    case "email":
    case "url":
    case "relationship":
    case "attachment":
    case "json":
    case "system":
    default:
      return formatDisplay(
        value === undefined || value === null || value === "" ? undefined : String(value),
      );
  }
}

/** String value passed into InlineEditCell while editing (plain text for secure fields). */
export function toEditString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
