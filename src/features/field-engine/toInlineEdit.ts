/**
 * Map Universal Field Engine types → InlineEditCell widget types (BP-037).
 */

import type { InlineFieldType, InlineSelectOption } from "@/components/inline-edit";

import type { FieldDefinition } from "./types";

export function toInlineFieldType(def: FieldDefinition): InlineFieldType {
  switch (def.type) {
    case "longText":
      return "textarea";
    case "date":
      return "date";
    case "number":
    case "currency":
    case "percentage":
      return "number";
    case "enum":
    case "boolean":
      return "select";
    case "phone":
      return "tel";
    case "email":
      return "email";
    case "url":
      return "url";
    case "text":
    case "secureText":
    case "relationship":
    case "attachment":
    case "json":
    case "system":
    default:
      return "text";
  }
}

export function toInlineOptions(def: FieldDefinition): InlineSelectOption[] | undefined {
  if (def.type === "boolean") {
    return [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ];
  }
  if (def.type !== "enum" || !def.enumValues) return undefined;
  return def.enumValues.map((option) => ({ value: option.value, label: option.label }));
}

export function isFieldEditable(def: FieldDefinition): boolean {
  if (def.type === "system" || def.type === "json" || def.type === "attachment") {
    return false;
  }
  return def.editable !== false;
}
