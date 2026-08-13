/**
 * Spreadsheet filter architecture (BP-038A).
 *
 * Operator catalog + helpers. No UI and no query execution in this milestone.
 * Future filter UI / repository query builders consume these types.
 */

import type { PersonFieldType as FieldType } from "@/features/people/fieldCatalog";

import type { FilterOperator, SpreadsheetFilter } from "./types";

/** Operators available for a given catalog field type. */
export const FILTER_OPERATORS_BY_TYPE: Record<FieldType, readonly FilterOperator[]> = {
  text: ["equals", "not_equals", "contains", "starts_with", "ends_with", "empty", "not_empty", "in"],
  longText: ["contains", "starts_with", "empty", "not_empty"],
  secureText: ["empty", "not_empty", "equals"],
  date: ["equals", "before", "after", "between", "empty", "not_empty"],
  number: ["equals", "not_equals", "gt", "gte", "lt", "lte", "between", "empty", "not_empty"],
  currency: ["equals", "not_equals", "gt", "gte", "lt", "lte", "between", "empty", "not_empty"],
  percentage: ["equals", "not_equals", "gt", "gte", "lt", "lte", "between", "empty", "not_empty"],
  boolean: ["equals", "empty", "not_empty"],
  enum: ["equals", "not_equals", "in", "not_in", "empty", "not_empty"],
  phone: ["equals", "contains", "starts_with", "empty", "not_empty"],
  email: ["equals", "contains", "starts_with", "empty", "not_empty"],
  url: ["equals", "contains", "starts_with", "empty", "not_empty"],
  relationship: ["equals", "in", "not_in", "empty", "not_empty"],
  attachment: ["empty", "not_empty"],
  system: ["equals", "empty", "not_empty"],
  json: ["empty", "not_empty"],
};

export function operatorsForFieldType(type: FieldType): readonly FilterOperator[] {
  return FILTER_OPERATORS_BY_TYPE[type] ?? ["empty", "not_empty"];
}

export function isOperatorAllowedForType(type: FieldType, operator: FilterOperator): boolean {
  return operatorsForFieldType(type).includes(operator);
}

/** True when the operator requires a primary value. */
export function filterRequiresValue(operator: FilterOperator): boolean {
  return operator !== "empty" && operator !== "not_empty";
}

/** True when the operator requires a second bound (`valueTo`). */
export function filterRequiresValueTo(operator: FilterOperator): boolean {
  return operator === "between";
}

/** Lightweight structural check for architecture consumers / future validators. */
export function isSpreadsheetFilter(value: unknown): value is SpreadsheetFilter {
  if (!value || typeof value !== "object") return false;
  const candidate = value as SpreadsheetFilter;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.fieldId === "string" &&
    typeof candidate.operator === "string"
  );
}
