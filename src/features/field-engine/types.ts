/**
 * Universal Field Engine types (BP-037).
 *
 * Field definitions describe themselves; renderers/editors/formatters/
 * validators consume this metadata. Domain catalogs (e.g. Person) map into
 * these types — workspaces must not invent per-field edit logic.
 */

/** Supported field types for the Universal Field Engine. */
export type FieldType =
  | "text"
  | "longText"
  | "date"
  | "number"
  | "boolean"
  | "enum"
  | "phone"
  | "email"
  | "url"
  | "currency"
  | "percentage"
  | "relationship"
  | "attachment"
  /** Sensitive text stored as plain string; masked at rest in the UI. */
  | "secureText"
  /** Non-editable system / computed fields. */
  | "system"
  /** Opaque JSON blobs (not inline-edited via FieldRenderer yet). */
  | "json";

export type FieldEnumOption<T extends string = string> = {
  value: T;
  label: string;
};

/**
 * Capability + presentation metadata every field should eventually carry.
 * Domain catalogs may omit flags; the engine applies defaults.
 */
export type FieldCapabilities = {
  required?: boolean;
  sensitive?: boolean;
  editable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  maxLength?: number;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
  enumValues?: readonly FieldEnumOption[];
  description?: string;
};

export type FieldDefinition<TKey extends string = string> = FieldCapabilities & {
  key: TKey;
  label: string;
  type: FieldType;
};

/** Result of parsing a raw editor string into a typed domain value. */
export type FieldParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };
